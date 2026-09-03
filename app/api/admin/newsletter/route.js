import { NextResponse } from "next/server";
import { assertSameOrigin, hasAdminSession } from "../../../../lib/admin";
import { createNewsletterDraft, deleteNewsletterDraft, getNewsletterStudio, sendNewsletterDraft } from "../../../../lib/newsletter";
import { getPosts } from "../../../../lib/posts";

async function authorized(request) {
  assertSameOrigin(request);
  if (!await hasAdminSession()) throw new Error("Sign in to manage newsletters.");
}

function errorResponse(error) { return NextResponse.json({ error: error.message || "Unable to manage newsletter." }, { status: 400 }); }

export async function GET(request) {
  try {
    await authorized(request);
    return NextResponse.json(await getNewsletterStudio(getPosts()));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request) {
  try {
    await authorized(request);
    const body = await request.json();
    if (body.action === "create") return NextResponse.json(await createNewsletterDraft(getPosts(), body));
    if (body.action === "send") return NextResponse.json(await sendNewsletterDraft(body.id));
    if (body.action === "delete") return NextResponse.json(await deleteNewsletterDraft(body.id));
    throw new Error("Unknown newsletter action.");
  } catch (error) { return errorResponse(error); }
}
