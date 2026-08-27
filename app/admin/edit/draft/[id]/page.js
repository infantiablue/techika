import { notFound, redirect } from "next/navigation";
import { AdminArticles } from "../../../../../components/admin-articles";
import { hasAdminSession } from "../../../../../lib/admin";
import { getAdminState } from "../../../../../lib/github-media";

export const dynamic = "force-dynamic";

export default async function AdminDraftPage({ params }) {
  if (!await hasAdminSession()) redirect("/admin/");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return <AdminArticles initialState={await getAdminState()} draftKey={id} />;
}
