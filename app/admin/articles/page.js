import { redirect } from "next/navigation";
import { AdminArticleList } from "../../../components/admin-article-list";
import { hasAdminSession } from "../../../lib/admin";
import { getAdminState } from "../../../lib/github-media";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  if (!await hasAdminSession()) redirect("/admin/");
  return <AdminArticleList articles={(await getAdminState()).articles} />;
}
