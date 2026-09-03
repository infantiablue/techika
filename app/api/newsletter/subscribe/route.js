import { NextResponse } from "next/server";
import { assertSameOrigin } from "../../../../lib/admin";
import { requestNewsletterSubscription } from "../../../../lib/newsletter";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const { email, website } = await request.json();
    if (website) return NextResponse.json({ ok: true });
    await requestNewsletterSubscription(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to subscribe." }, { status: 400 });
  }
}
