/** TEMPORARY diagnostic (preview deployments only): mint a Soniox key and transcribe a known clip. */
import { mintSpeechToken } from "@/lib/server/speech-token";
import { PCM_B64 } from "./audio";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (process.env.VERCEL_ENV === "production" || new URL(req.url).searchParams.get("t") !== "215f0ed36052fe6686e6a418") {
    return new Response("not found", { status: 404 });
  }
  const tokRes = await mintSpeechToken("soniox");
  const tokBody = await tokRes.json();
  if (!tokRes.ok) return Response.json({ stage: "token", status: tokRes.status, body: tokBody });
  const pcm = Buffer.from(PCM_B64, "base64");
  const log: string[] = [];
  let text = "";
  const langs: string[] = [];
  await new Promise<void>((resolve) => {
    const ws = new WebSocket("wss://stt-rt.soniox.com/transcribe-websocket");
    ws.binaryType = "arraybuffer";
    const done = setTimeout(() => { log.push("timeout"); try { ws.close(); } catch {} resolve(); }, 40000);
    ws.onopen = async () => {
      log.push("open");
      ws.send(JSON.stringify({ api_key: tokBody.token, model: "stt-rt-v5", audio_format: "pcm_s16le", sample_rate: 16000, num_channels: 1, language_hints: ["ro", "en"], enable_language_identification: true, enable_endpoint_detection: true }));
      for (let i = 0; i < pcm.length; i += 3200) { ws.send(pcm.subarray(i, i + 3200)); await new Promise((r) => setTimeout(r, 20)); }
      ws.send(new ArrayBuffer(0));
      log.push("sent " + pcm.length);
    };
    ws.onmessage = (ev) => {
      const raw = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data as ArrayBuffer);
      try {
        const m = JSON.parse(raw);
        if (m.error_code) log.push("error " + m.error_code + " " + m.error_message);
        for (const t of m.tokens ?? []) if (t.is_final) { text += t.text; if (t.language) langs.push(t.language); }
        if (m.finished) { log.push("finished"); clearTimeout(done); ws.close(); resolve(); }
      } catch { log.push("raw " + raw.slice(0, 200)); }
    };
    ws.onerror = (e) => log.push("ws error " + String((e as ErrorEvent).message ?? ""));
    ws.onclose = (e) => { log.push("close " + e.code + " " + e.reason); clearTimeout(done); resolve(); };
  });
  return Response.json({ stage: "done", text, langs: [...new Set(langs)], log, tokenExpires: tokBody.expiresAt });
}
