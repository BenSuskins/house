import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { buildApp } from './app';
import { SqliteDesignStore } from './store';

const directory = resolve('dist/client');
const app = await buildApp(new SqliteDesignStore(process.env.HOUSE_DB_PATH ?? resolve('data/house.db')), existsSync(directory) ? directory : undefined);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => { await app.close(); process.exit(0); });
try { await app.listen({ port: Number(process.env.PORT ?? 8080), host: process.env.HOST ?? '0.0.0.0' }); }
catch (error) { console.error(error); await app.close(); process.exit(1); }
