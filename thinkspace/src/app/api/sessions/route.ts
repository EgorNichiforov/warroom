import { requireOwner } from "@/lib/auth";
import { CreateSessionBody } from "@/lib/contracts/api";
import { createSession, listSessions } from "@/lib/db/repo";
import { handle, parseBody } from "@/lib/server/http";

export const runtime = "nodejs";

export function defaultSessionTitle(d = new Date()): string {
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `Thinking session — ${date} ${time}`;
}

export async function GET(req: Request) {
  return handle(async () => {
    const ownerId = await requireOwner(req);
    const q = new URL(req.url).searchParams.get("q") ?? undefined;
    const sessions = await listSessions(ownerId, q);
    return Response.json({ sessions });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const ownerId = await requireOwner(req);
    const body = await parseBody(req, CreateSessionBody);
    const session = await createSession({
      ownerId,
      title: body.title?.trim() || defaultSessionTitle(),
      languageHint: body.languageHint ?? null,
      settings: body.settings ?? {},
    });
    return Response.json({ session }, { status: 201 });
  });
}
