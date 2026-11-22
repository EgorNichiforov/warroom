import { requireOwner } from "@/lib/auth";
import { searchAll } from "@/lib/db/repo";
import { handle } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return handle(async () => {
    const ownerId = await requireOwner(req);
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const results = await searchAll(ownerId, q);
    return Response.json({ results, q }, { headers: { "cache-control": "no-store" } });
  });
}
