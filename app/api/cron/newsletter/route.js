import { NextResponse } from "next/server";
import { createWeeklyNewsletterDraft } from "../../../../lib/newsletter";
import { getPosts } from "../../../../lib/posts";

export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });
  try {
    return NextResponse.json(await createWeeklyNewsletterDraft(getPosts()));
  } catch (error) {
    console.error("Newsletter draft failed", error);
    return NextResponse.json({ error: "Unable to create newsletter draft." }, { status: 500 });
  }
}
