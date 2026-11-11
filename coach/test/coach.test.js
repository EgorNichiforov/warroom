import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContext, localNow, setWeight, addCounter, setTop3, minimumMet, gradeFor, dayScore, counterWeek, addDays, dowOf, monday, workoutsWeek, pipelineLine, blocksFor } from '../src/warroom.js';
import { toAnthropic, toAnthropicTools, toOpenAIChunks } from '../src/llm.js';
import { buildAssistant } from '../src/vapi.js';
import { TOOLS } from '../src/prompt.js';

function sampleState() {
  return {
    settings: { minDials: 10, minBac: 25, stake: 500, currency: 'MDL', weightTarget: 85, weightTargetDate: '2027-07-01', bigDate: '2027-07-01', bacDate: '2027-06-01' },
    routines: { morning: [{ id: 'weigh', title: 'Weigh in', days: [1, 2, 3, 4, 5, 6, 7], link: 'weight' }, { id: 'train', title: 'Train', days: [1, 2, 3, 4, 5, 6, 7] }], evening: [{ id: 'bed', title: 'Bed', days: [1, 2, 3, 4, 5, 6, 7] }] },
    habits: { items: [{ id: 'meal', title: 'Ate the plan' }] },
    counters: { items: [{ id: 'dials', title: 'Dials', unit: '', targets: [0, 25, 55, 30, 70, 45, 0, 0], weekly: 225 }, { id: 'owners', title: 'Owner conversations', targets: [0, 0, 0, 0, 0, 0, 0, 0], weekly: 0 }, { id: 'bac', title: 'BAC', unit: 'min', targets: [0, 75, 75, 75, 165, 165, 200, 230], weekly: 1200 }] },
    schedule: { blocks: [{ id: 'a', title: '⚖️ Weigh-in', start: '05:20', end: '05:30', days: [1, 2, 3, 4, 5, 6, 7], kind: 'routine' }, { id: 'b', title: '📞 DIALS: 55', start: '17:00', end: '18:55', days: [2], kind: 'dials' }] },
    programs: { core: { name: 'Core + prehab', ex: [] } }, programByDay: { map: { 2: 'core' } },
    days: { '2026-11-09': { routine: { weigh: 1, train: 1, bed: 1 }, habits: { meal: 1 }, counters: { dials: 25, owners: 2, bac: 75 }, top3: [{ t: 'Dial 25', d: 1 }, { t: '', d: 0 }, { t: '', d: 0 }], weight: 74.9, shutdownAt: 1, win: 'All dials', loss: '', fix: 'Start dials earlier' } },
    tasks: {}, goals: {}, reviews: { 'w2026-11-02': { change: 'Dials before Green group' } }, stakes: { '2026-11-06': { amount: 500, paid: false, reason: '4/10 dials' } },
  };
}
const NOW = { date: '2026-11-10', hm: '05:25', min: 325, dow: 2 };

test('date helpers', () => {
  assert.equal(addDays('2026-11-10', -1), '2026-11-09');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(dowOf('2026-11-10'), 2);
  assert.equal(monday('2026-11-12'), '2026-11-09');
  const n = localNow(new Date('2026-11-10T03:25:00Z')); // winter: UTC+2
  assert.equal(n.date, '2026-11-10'); assert.equal(n.hm, '05:25'); assert.equal(n.dow, 2);
  const s = localNow(new Date('2026-07-10T02:25:00Z')); // summer: UTC+3
  assert.equal(s.hm, '05:25');
});

test('derived numbers match the app rules', () => {
  const S = sampleState();
  assert.equal(dayScore(S, '2026-11-09'), 100);
  assert.equal(gradeFor(S, '2026-11-09', '2026-11-10'), 'A');
  assert.deepEqual(minimumMet(S, '2026-11-09'), { met: true, dials: 25, bac: 75, needDials: 10, needBac: 25 });
  assert.equal(counterWeek(S, 'dials', '2026-11-10'), 25);
});

test('brief contains the numbers the coach needs', () => {
  const S = sampleState(); const ctx = buildContext(S, NOW);
  assert.match(ctx, /Tuesday 10 November 05:25/);
  assert.match(ctx, /Yesterday \(Monday 9 November\): grade A \(100%\)\. Dials 25\/25, owner conversations 2, BAC 75\/75 min, weight 74\.9 kg\. Minimum day met\. Shutdown done\./);
  assert.match(ctx, /Stakes owed: 500 MDL \(1 missed day\)/);
  assert.match(ctx, /Week so far: dials 25\/225 \(need 50\/day over 4 remaining dial days\)/);
  assert.match(ctx, /Today \(Tuesday\): training Core \+ prehab\. Dial target 55\. BAC target 75 min/);
  assert.match(ctx, /Dial blocks: 17:00–18:55 DIALS: 55/);
  assert.match(ctx, /Top 3 for today: NOT SET/);
  assert.match(ctx, /This week's one change .*: Dials before Green group/);
  assert.match(ctx, /Weighed in today: no/);
});

test('tool writes update the day like the app would', () => {
  const S = sampleState();
  assert.equal(setWeight(S, '2026-11-10', 74.84), 74.8);
  assert.equal(S.days['2026-11-10'].routine.weigh, 1);
  assert.equal(addCounter(S, '2026-11-10', 'dials', 10, 'add'), 10);
  assert.equal(addCounter(S, '2026-11-10', 'dials', 30, 'set'), 30);
  assert.deepEqual(setTop3(S, '2026-11-10', ['Dial 55 before Red ', 'BAC Istorie']), ['Dial 55 before Red', 'BAC Istorie']);
  assert.ok(S.days['2026-11-10']._u > 0);
  assert.match(buildContext(S, NOW), /Weighed in today: yes, 74\.8 kg/);
});

test('assistant config is valid for Vapi (native and custom)', () => {
  const env = { PUBLIC_URL: 'https://x.workers.dev', VAPI_SERVER_SECRET: 's' };
  const a = buildAssistant(env, 'BRIEF', 'morning');
  assert.equal(a.model.provider, 'anthropic'); assert.equal(a.model.model, 'claude-opus-4-6');
  assert.match(a.model.messages[0].content, /MORNING WAKE-UP CALL/); assert.match(a.model.messages[0].content, /BRIEF$/);
  assert.equal(a.server.url, 'https://x.workers.dev/vapi'); assert.ok(a.model.tools.some((t) => t.type === 'endCall'));
  const c = buildAssistant({ ...env, MODEL_MODE: 'custom' }, 'BRIEF', 'checkin');
  assert.equal(c.model.provider, 'custom-llm'); assert.equal(c.model.url, 'https://x.workers.dev/llm'); assert.equal(c.model.model, 'claude-opus-5-5');
  assert.ok(TOOLS.every((t) => t.type !== 'function' || (t.function.name && t.function.parameters.type === 'object')));
});

test('OpenAI messages convert to a valid Anthropic conversation', () => {
  const { system, messages } = toAnthropic([
    { role: 'system', content: 'SYS' }, { role: 'assistant', content: 'Morning. Weight?' }, { role: 'user', content: 'seventy four point eight' },
    { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'log_weight', arguments: '{"kg":74.8}' } }] },
    { role: 'tool', tool_call_id: 'call_1', content: 'saved 74.8 kg' }, { role: 'tool', tool_call_id: 'call_2', content: 'x' }, { role: 'user', content: 'ok' },
  ]);
  assert.equal(system, 'SYS');
  assert.equal(messages[0].role, 'user'); // injected opener so the conversation starts with a user turn
  assert.deepEqual(messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant', 'user']);
  assert.deepEqual(messages[3].content[0], { type: 'tool_use', id: 'call_1', name: 'log_weight', input: { kg: 74.8 } });
  assert.equal(messages[4].content.length, 3); assert.equal(messages[4].content[0].type, 'tool_result'); assert.equal(messages[4].content[2].text, 'ok');
  const tools = toAnthropicTools(TOOLS);
  assert.equal(tools.length, 6); assert.equal(tools[0].name, 'log_weight'); assert.equal(tools[0].input_schema.required[0], 'kg');
});

test('Anthropic stream events become OpenAI chunks with tool calls', async () => {
  async function* events() {
    yield { type: 'message_start' };
    yield { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } };
    yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Logging that.' } };
    yield { type: 'content_block_stop', index: 0 };
    yield { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'toolu_1', name: 'log_weight', input: {} } };
    yield { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"kg":' } };
    yield { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '74.8}' } };
    yield { type: 'content_block_stop', index: 1 };
    yield { type: 'message_delta', delta: { stop_reason: 'tool_use' } };
    yield { type: 'message_stop' };
  }
  const chunks = []; for await (const c of toOpenAIChunks(events(), 'id1', 'm')) chunks.push(c);
  assert.equal(chunks[1].choices[0].delta.content, 'Logging that.');
  assert.equal(chunks[2].choices[0].delta.tool_calls[0].function.name, 'log_weight');
  assert.equal(chunks[3].choices[0].delta.tool_calls[0].function.arguments + chunks[4].choices[0].delta.tool_calls[0].function.arguments, '{"kg":74.8}');
  assert.equal(chunks.at(-1).choices[0].finish_reason, 'tool_calls');
});

test('v4 shapes: skipped routine steps, workouts array, one-day schedule changes, pipeline row', () => {
  const S = sampleState();
  S.days['2026-11-09'].routine.train = 'skip:overslept';
  assert.equal(dayScore(S, '2026-11-09'), 100); // a skipped step is not counted against the day
  S.days['2026-11-09'].workouts = [{ kind: 'program', done: true }]; delete S.days['2026-11-09'].workout;
  assert.equal(workoutsWeek(S, '2026-11-10'), 1);
  S.days['2026-11-10'] = { sched: { skip: ['b'], add: [{ id: 'x', title: 'Dentist', start: '16:00', end: '17:00', kind: 'other' }] } };
  assert.deepEqual(blocksFor(S, '2026-11-10').map((b) => b.title), ['⚖️ Weigh-in', 'Dentist']);
  const Q = { items: { a: { agency: 'Sunrise Care', status: 'member', plan: 'pb' }, b: { agency: 'Gulf Home', status: 'trial' }, c: { agency: 'Naples Care', status: 'voicemail', next_at: '2026-11-10' }, d: { agency: 'X', status: 'new' }, e: { agency: 'Gone', status: 'new', _del: true } } };
  assert.equal(pipelineLine(Q, '2026-11-10'), 'Pipeline: MRR $1,500 (1 member), 1 trial, 1 callback due: Naples Care, 1 fresh numbers in the queue.');
  assert.match(buildContext(S, NOW, Q), /Pipeline: MRR \$1,500/);
});
