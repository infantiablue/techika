import { redirect } from "next/navigation";
import { AdminLogin } from "../../components/admin-login";
import { hasAdminSession } from "../../lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (await hasAdminSession()) redirect("/admin/articles/");
  return <AdminLogin />;
}
