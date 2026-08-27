import { redirect } from "next/navigation";
import { AdminMedia } from "../../../components/admin-media";
import { hasAdminSession } from "../../../lib/admin";
import { getAdminState } from "../../../lib/github-media";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  if (!await hasAdminSession()) redirect("/admin/");
  return <AdminMedia initialState={await getAdminState()} />;
}
