import { notFound, redirect } from "next/navigation";
import { AdminArticles } from "../../../../components/admin-articles";
import { hasAdminSession } from "../../../../lib/admin";
import { getAdminState, getArticle } from "../../../../lib/github-media";
import { articleDraftKey } from "../../../../lib/article-drafts";

export const dynamic = "force-dynamic";

export default async function AdminEditArticlePage({ params }) {
  if (!await hasAdminSession()) redirect("/admin/");
  const { slug } = await params;
  if (slug === "new") return <AdminArticles initialState={await getAdminState()} draftKey="new" />;
  try {
    const [initialState, initialArticle] = await Promise.all([getAdminState(), getArticle(slug)]);
    return <AdminArticles initialState={initialState} initialArticle={initialArticle} draftKey={articleDraftKey(slug)} />;
  } catch (error) {
    if (error.message === "Article not found.") notFound();
    throw error;
  }
}
