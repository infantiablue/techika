import { NextResponse } from "next/server";
import { assertSameOrigin, hasAdminSession } from "../../../../lib/admin";
import { generateCover } from "../../../../lib/ai-cover";

export const maxDuration = 120;

export async function POST(request) {
  try {
    assertSameOrigin(request);
    if (!await hasAdminSession()) throw new Error("Sign in to generate a cover.");
    const image = await generateCover(await request.json());
    return new NextResponse(image, { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to generate a cover." }, { status: 400 });
  }
}
