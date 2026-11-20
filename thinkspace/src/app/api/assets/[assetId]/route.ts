import { requireOwner } from "@/lib/auth";
import { getAsset } from "@/lib/db/repo";
import { handle, notFound, type AssetCtx } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: AssetCtx) {
  return handle(async () => {
    const ownerId = await requireOwner(req);
    const { assetId } = await ctx.params;
    const found = await getAsset(assetId);
    // Same 404 for missing and foreign assets so ids cannot be probed.
    if (!found || found.ownerId !== ownerId) return notFound("asset not found");
    const body = new Uint8Array(found.bytes); // copy onto a plain ArrayBuffer so it is a valid BodyInit
    return new Response(body, {
      headers: {
        "content-type": found.asset.mime,
        "content-length": String(body.byteLength),
        "cache-control": "private, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  });
}
