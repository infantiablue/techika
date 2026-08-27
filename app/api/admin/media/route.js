import { NextResponse } from "next/server";
import { assertSameOrigin, hasAdminSession } from "../../../../lib/admin";
import { ConflictError, deleteImage, setCover, uploadImage } from "../../../../lib/github-media";

function errorResponse(error) {
  const status = error instanceof ConflictError ? 409 : 400;
  return NextResponse.json({ error: error.message || "Unable to publish media." }, { status });
}

async function authorized(request) {
  assertSameOrigin(request);
  if (!await hasAdminSession()) throw new Error("Sign in to manage media.");
}

export async function POST(request) {
  try {
    await authorized(request);
    const form = await request.formData();
    return NextResponse.json(await uploadImage({ file: form.get("file"), slug: form.get("slug"), setCover: form.get("setCover") === "true", imageAlt: form.get("imageAlt") }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    await authorized(request);
    return NextResponse.json(await setCover(await request.json()));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request) {
  try {
    await authorized(request);
    const { image } = await request.json();
    return NextResponse.json(await deleteImage(image));
  } catch (error) {
    return errorResponse(error);
  }
}
