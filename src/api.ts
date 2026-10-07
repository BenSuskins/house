import type { Result } from './domain/types';

export async function api<Value>(path: string, method = 'GET', body?: unknown): Promise<Result<Value>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, { method, signal: controller.signal, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const value = await response.json();
    if (!response.ok) return { ok: false, error: { code: typeof value.code === 'string' ? value.code : 'network', message: typeof value.message === 'string' ? value.message : 'The server cannot complete this request.' } };
    return { ok: true, value };
  } catch { return { ok: false, error: { code: 'network', message: 'The server is unavailable. Your changes remain on this device.' } }; }
  finally { clearTimeout(timer); }
}
