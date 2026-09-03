import { redirect } from "next/navigation";
import { NewsletterStudio } from "../../../components/newsletter-studio";
import { hasAdminSession } from "../../../lib/admin";
import { getNewsletterStudio } from "../../../lib/newsletter";
import { getPosts } from "../../../lib/posts";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  if (!await hasAdminSession()) redirect("/admin/");
  return <NewsletterStudio initialState={await getNewsletterStudio(getPosts())} />;
}
