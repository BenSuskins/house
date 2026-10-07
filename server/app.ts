import Fastify, { type FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import { house } from '../src/domain/house';
import { catalogue } from '../src/domain/catalogue';
import { createDesign, failure } from '../src/domain/editor';
import type { Result } from '../src/domain/types';
import type { DesignStore } from './store';

export async function buildApp(store: DesignStore, staticDirectory?: string) {
  const app = Fastify({ logger: process.env.NODE_ENV === 'production', bodyLimit: 2 * 1024 * 1024 });
  const respond = <Value>(reply: FastifyReply, result: Result<Value>, status = 200) => {
    if (result.ok) return reply.code(status).send(result.value);
    return reply.code({ invalid: 400, boundary: 400, conflict: 409, 'not-found': 404, storage: 503 }[result.error.code] ?? 500).send(result.error);
  };
  app.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'DELETE'].includes(request.method) && request.headers.origin) {
      let origin: string;
      try { origin = new URL(request.headers.origin).host; } catch { return reply.code(403).send({ code: 'origin', message: 'Use the app to change designs.' }); }
      if (origin !== request.headers.host) return reply.code(403).send({ code: 'origin', message: 'Use the app to change designs.' });
    }
  });
  app.get('/healthz', async (_, reply) => reply.code(store.healthy() ? 200 : 503).send({ status: store.healthy() ? 'ok' : 'unavailable' }));
  app.get('/api/house', async () => house);
  app.get('/api/catalogue', async () => catalogue);
  app.get('/api/designs', async (_, reply) => respond(reply, store.list()));
  app.get<{ Params: { id: string } }>('/api/designs/:id', async (request, reply) => respond(reply, store.get(request.params.id)));
  app.post<{ Body: { name?: string; copyOf?: string; content?: unknown } }>('/api/designs', async (request, reply) => {
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || (body.name !== undefined && typeof body.name !== 'string') || (body.copyOf !== undefined && typeof body.copyOf !== 'string')) return respond(reply, failure('invalid', 'Enter a design name.'));
    let content: unknown = body.content;
    if (content === undefined && body.copyOf) {
      const source = store.get(body.copyOf);
      if (!source.ok) return respond(reply, source);
      content = { ...source.value, name: body.name ?? `${source.value.name} copy`.slice(0, 80) };
    }
    if (content === undefined) content = createDesign(body.name ?? 'Untitled layout');
    return respond(reply, store.create(content), 201);
  });
  app.put<{ Params: { id: string }; Body: { revision?: number } }>('/api/designs/:id', async (request, reply) => {
    const body = request.body;
    if (!body || !Number.isInteger(body.revision) || body.revision! < 1) return respond(reply, failure('invalid', 'Use the saved design revision.'));
    return respond(reply, store.update(request.params.id, body.revision!, body));
  });
  app.delete<{ Params: { id: string }; Querystring: { revision?: string } }>('/api/designs/:id', async (request, reply) => {
    const revision = Number(request.query.revision);
    if (!Number.isInteger(revision) || revision < 1) return respond(reply, failure('invalid', 'Use the saved design revision.'));
    return respond(reply, store.remove(request.params.id, revision));
  });
  app.addHook('onClose', async () => store.close());
  if (staticDirectory) {
    await app.register(fastifyStatic, { root: staticDirectory, index: 'index.html' });
    app.setNotFoundHandler((request, reply) => request.method === 'GET' && !request.url.startsWith('/api/') && !request.url.includes('.') ? reply.sendFile('index.html') : reply.code(404).send({ code: 'not-found', message: 'The page does not exist.' }));
  }
  return app;
}
