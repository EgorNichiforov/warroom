import { requireOwner } from "@/lib/auth";
import { SpeechTokenBody } from "@/lib/contracts/api";
import { handle, parseBody } from "@/lib/server/http";
import { mintSpeechToken } from "@/lib/server/speech-token";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handle(async () => {
    await requireOwner(req);
    const { provider } = await parseBody(req, SpeechTokenBody);
    return mintSpeechToken(provider);
  });
}
