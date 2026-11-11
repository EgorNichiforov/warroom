/* Optional custom-LLM mode: an OpenAI-compatible /chat/completions endpoint that Vapi can talk to,
   backed by the official Anthropic SDK and Claude Opus 5.5. Vapi sends OpenAI-shaped messages and
   tools and expects OpenAI-shaped SSE chunks back. */
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';

/* OpenAI chat messages -> Anthropic system + messages. Exported for tests. */
export function toAnthropic(oaMessages) {
  const system = [], out = [];
  const push = (role, block) => { const last = out[out.length - 1]; if (last && last.role === role) last.content.push(block); else out.push({ role, content: [block] }); };
  for (const m of oaMessages || []) {
    if (m.role === 'system') { if (m.content) system.push(typeof m.content === 'string' ? m.content : JSON.stringify(m.content)); continue; }
    if (m.role === 'user') { push('user', { type: 'text', text: typeof m.content === 'string' ? m.content : (m.content || []).map((c) => c.text || '').join('') }); continue; }
    if (m.role === 'assistant') {
      if (m.content) push('assistant', { type: 'text', text: typeof m.content === 'string' ? m.content : (m.content || []).map((c) => c.text || '').join('') });
      for (const tc of m.tool_calls || []) { let input = {}; try { input = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments || '{}') : (tc.function.arguments || {}); } catch { input = {}; } push('assistant', { type: 'tool_use', id: tc.id, name: tc.function.name, input }); }
      continue;
    }
    if (m.role === 'tool' || m.role === 'function') { push('user', { type: 'tool_result', tool_use_id: m.tool_call_id, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }); }
  }
  // Anthropic requires the conversation to start with a user turn and never two in a row (handled by push).
  if (!out.length || out[0].role !== 'user') out.unshift({ role: 'user', content: [{ type: 'text', text: '(call connected)' }] });
  for (const m of out) if (m.role === 'user' && m.content.length && m.content.every((c) => c.type === 'text' && !c.text.trim())) m.content = [{ type: 'text', text: '(silence)' }];
  return { system: system.join('\n\n'), messages: out };
}

export function toAnthropicTools(oaTools) {
  return (oaTools || []).filter((t) => t.type === 'function' && t.function).map((t) => ({ name: t.function.name, description: t.function.description || '', input_schema: t.function.parameters || { type: 'object', properties: {} } }));
}

/* Anthropic stream events -> OpenAI SSE chunks. Exported for tests (takes any async iterable of events). */
export async function* toOpenAIChunks(events, id, model) {
  const base = () => ({ id, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model });
  const toolIndex = {}; let nextTool = 0; let sawTool = false;
  yield { ...base(), choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] };
  for await (const ev of events) {
    if (ev.type === 'content_block_start' && ev.content_block?.type === 'tool_use') {
      sawTool = true; const idx = nextTool++; toolIndex[ev.index] = idx;
      yield { ...base(), choices: [{ index: 0, delta: { tool_calls: [{ index: idx, id: ev.content_block.id, type: 'function', function: { name: ev.content_block.name, arguments: '' } }] }, finish_reason: null }] };
    } else if (ev.type === 'content_block_delta') {
      if (ev.delta?.type === 'text_delta' && ev.delta.text) yield { ...base(), choices: [{ index: 0, delta: { content: ev.delta.text }, finish_reason: null }] };
      else if (ev.delta?.type === 'input_json_delta' && ev.delta.partial_json) yield { ...base(), choices: [{ index: 0, delta: { tool_calls: [{ index: toolIndex[ev.index] ?? 0, function: { arguments: ev.delta.partial_json } }] }, finish_reason: null }] };
    } else if (ev.type === 'message_delta' && ev.delta?.stop_reason) {
      const fr = ev.delta.stop_reason === 'tool_use' || sawTool ? 'tool_calls' : ev.delta.stop_reason === 'max_tokens' ? 'length' : 'stop';
      yield { ...base(), choices: [{ index: 0, delta: {}, finish_reason: fr }] };
    }
  }
}

export async function handleChatCompletions(request, env) {
  const body = await request.json();
  const { system, messages } = toAnthropic(body.messages);
  const tools = toAnthropicTools(body.tools);
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const params = { model: MODEL, max_tokens: Math.min(Number(body.max_tokens) || 400, 1024), system, messages, output_config: { effort: 'low' }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };
  if (tools.length) { params.tools = tools; params.tool_choice = { type: 'auto', disable_parallel_tool_use: true }; }
  const id = 'chatcmpl-' + crypto.randomUUID();
  if (body.stream === false) {
    const msg = await client.beta.messages.create(params);
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const tool_calls = msg.content.filter((b) => b.type === 'tool_use').map((b, i) => ({ index: i, id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input) } }));
    return Response.json({ id, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: MODEL, choices: [{ index: 0, message: { role: 'assistant', content: text || null, ...(tool_calls.length ? { tool_calls } : {}) }, finish_reason: tool_calls.length ? 'tool_calls' : 'stop' }], usage: { prompt_tokens: msg.usage.input_tokens, completion_tokens: msg.usage.output_tokens, total_tokens: msg.usage.input_tokens + msg.usage.output_tokens } });
  }
  const stream = client.beta.messages.stream(params);
  const enc = new TextEncoder();
  const rs = new ReadableStream({
    async start(ctrl) {
      try { for await (const chunk of toOpenAIChunks(stream, id, MODEL)) ctrl.enqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`)); }
      catch (e) { ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content: 'Sorry, I lost my train of thought. Say that again.' }, finish_reason: 'stop' }], error: String(e.message || e) })}\n\n`)); }
      ctrl.enqueue(enc.encode('data: [DONE]\n\n')); ctrl.close();
    },
  });
  return new Response(rs, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
}
