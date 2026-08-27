import { redirect } from "next/navigation";
import { hasAdminSession } from "../../../lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  if (!await hasAdminSession()) redirect("/admin/");
  redirect("/admin/articles/");
}
