import { NextResponse } from "next/server";
import { buildLineReply, parseLineEvents, replyLine, verifyLineSignature } from "@/lib/line";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const events = parseLineEvents(JSON.parse(body));

  await Promise.all(
    events
      .filter((event) => event.type === "message" && event.message?.type === "text" && event.replyToken)
      .map(async (event) => {
        const messages = await buildLineReply(event);
        await replyLine(event.replyToken as string, messages);
      })
  );

  return NextResponse.json({ ok: true });
}
