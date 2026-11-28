// Runs the worker's fetch handler in plain Node against the real Supabase row (no Cloudflare needed).
// Usage: node test/live.mjs brief | tools | call   (reads env from .dev.vars)
import fs from 'node:fs';
import { setGlobalDispatcher, ProxyAgent, EnvHttpProxyAgent } from 'undici';
if (process.env.HTTPS_PROXY) setGlobalDispatcher(new EnvHttpProxyAgent());
import worker from '../src/worker.js';
const env = Object.fromEntries(fs.readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
for (const l of fs.readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)\s*=\s*"([^"]*)"/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const what = process.argv[2] || 'brief';
const hit = (path, init) => worker.fetch(new Request('http://local' + path, init), env, { waitUntil() {} });
let r;
if (what === 'brief') r = await hit('/admin/brief', { headers: { 'x-admin-secret': env.ADMIN_SECRET } });
if (what === 'tools') r = await hit('/vapi', { method: 'POST', headers: { 'x-warroom-secret': env.VAPI_SERVER_SECRET, 'content-type': 'application/json' }, body: JSON.stringify({ message: { type: 'tool-calls', call: { id: 'local' }, toolCallList: [{ id: 't1', type: 'function', function: { name: 'log_weight', arguments: { kg: 74.6 } } }, { id: 't2', type: 'function', function: { name: 'log_dials', arguments: { dials: 10, owner_conversations: 1, mode: 'add' } } }, { id: 't3', type: 'function', function: { name: 'set_top3', arguments: { items: ['Dial 30 before Green', 'BAC Română 50 min', 'Call back 3 applicants'] } } }] } }) });
if (what === 'assistant-request') r = await hit('/vapi', { method: 'POST', headers: { 'x-warroom-secret': env.VAPI_SERVER_SECRET, 'content-type': 'application/json' }, body: JSON.stringify({ message: { type: 'assistant-request', customer: { number: env.EGOR_PHONE } } }) });
if (what === 'call') r = await hit('/admin/call?kind=morning', { method: 'POST', headers: { 'x-admin-secret': env.ADMIN_SECRET } });
console.log(r.status); console.log(await r.text());
