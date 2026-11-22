/**
 * NDJSON streaming responses: one JSON object per line, terminated by {"type":"stream.end"}.
 * Errors thrown by the producer become {"type":"stream.error","message"} before the stream closes,
 * so the client always sees a terminal line.
 */
import "server-only";

export type Emit = (obj: unknown) => void;

export function ndjsonStream(run: (emit: Emit) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          closed = true;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed by the consumer */
        }
      };
      (async () => {
        try {
          await run(write);
          write({ type: "stream.end" });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          write({ type: "stream.error", message });
        } finally {
          close();
        }
      })();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}

/** Parse a complete NDJSON body (used by tests and by server-side consumers). */
export async function readNdjson(res: Response): Promise<unknown[]> {
  const text = await res.text();
  return text
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as unknown);
}
