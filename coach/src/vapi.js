/* Vapi assistant construction and call placement. */
import { TOOLS, morningScript, checkinScript } from './prompt.js';

const VAPI = 'https://api.vapi.ai';

function modelConfig(env, systemPrompt) {
  const messages = [{ role: 'system', content: systemPrompt }];
  if ((env.MODEL_MODE || 'native') === 'custom') {
    // Our own OpenAI-compatible endpoint backed by the Anthropic SDK (Claude Opus 5.5). See llm.js.
    return { provider: 'custom-llm', url: `${env.PUBLIC_URL}/llm`, model: env.CUSTOM_MODEL || 'claude-opus-5-5', headers: { 'x-warroom-secret': env.VAPI_SERVER_SECRET }, timeoutSeconds: 30, messages, tools: TOOLS, maxTokens: 400 };
  }
  // Vapi-native Anthropic provider. Vapi's enum currently tops out at claude-opus-4-6.
  return { provider: 'anthropic', model: env.NATIVE_MODEL || 'claude-opus-4-6', messages, tools: TOOLS, temperature: 0.4, maxTokens: 400 };
}

export function buildAssistant(env, ctx, kind) {
  const prompt = kind === 'morning' ? morningScript(ctx) : checkinScript(ctx);
  return {
    name: kind === 'morning' ? 'War Room coach · morning' : 'War Room coach · check-in',
    model: modelConfig(env, prompt),
    voice: { provider: env.VOICE_PROVIDER || 'vapi', voiceId: env.VOICE_ID || 'Elliot' },
    firstMessageMode: 'assistant-speaks-first-with-model-generated-message',
    maxDurationSeconds: kind === 'morning' ? 300 : 600,
    silenceTimeoutSeconds: 25,
    backgroundSound: 'off',
    endCallMessage: 'Go.',
    server: { url: `${env.PUBLIC_URL}/vapi`, headers: { 'x-warroom-secret': env.VAPI_SERVER_SECRET }, timeoutSeconds: 20 },
    serverMessages: ['tool-calls', 'end-of-call-report', 'status-update'],
    metadata: { kind },
  };
}

/* The stored assistant used by the "Call coach" button in the app. Its prompt holds a {{context}}
   placeholder that the app fills with its local brief via assistantOverrides.variableValues. */
export function buildStoredAssistant(env) {
  const a = buildAssistant(env, '{{context}}', 'checkin');
  a.name = 'War Room coach';
  return a;
}

async function vapi(env, path, method, body) {
  const r = await fetch(VAPI + path, { method, headers: { Authorization: 'Bearer ' + env.VAPI_API_KEY, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`vapi ${method} ${path} ${r.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

export async function placeCall(env, assistant) {
  return vapi(env, '/call', 'POST', { assistant, phoneNumberId: env.VAPI_PHONE_NUMBER_ID, customer: { number: env.EGOR_PHONE, name: 'Egor' } });
}

export async function upsertStoredAssistant(env) {
  const body = buildStoredAssistant(env);
  if (env.VAPI_ASSISTANT_ID) return vapi(env, `/assistant/${env.VAPI_ASSISTANT_ID}`, 'PATCH', body);
  return vapi(env, '/assistant', 'POST', body);
}

export async function listPhoneNumbers(env) { return vapi(env, '/phone-number', 'GET'); }
