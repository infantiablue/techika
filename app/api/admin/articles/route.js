import { NextResponse } from "next/server";
import { assertSameOrigin, hasAdminSession } from "../../../../lib/admin";
import { ConflictError, getArticle, saveArticle } from "../../../../lib/github-media";

function errorResponse(error) {
  return NextResponse.json({ error: error.message || "Unable to save article." }, { status: error instanceof ConflictError ? 409 : 400 });
}

async function authorized(request, checkOrigin = false) {
  if (checkOrigin) assertSameOrigin(request);
  if (!await hasAdminSession()) throw new Error("Sign in to manage articles.");
}

export async function GET(request) {
  try {
    await authorized(request);
    const slug = new URL(request.url).searchParams.get("slug");
    if (!slug) throw new Error("Select an article.");
    return NextResponse.json({ article: await getArticle(slug) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  try {
    await authorized(request, true);
    return NextResponse.json(await saveArticle(await request.json()));
  } catch (error) {
    return errorResponse(error);
  }
}
