import { AdminNav } from "../../components/admin-nav";
import { ThemeSelect } from "../../components/theme-select";
import { hasAdminSession } from "../../lib/admin";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }) {
  const authenticated = await hasAdminSession();
  return <>{authenticated ? <AdminNav /> : <div className="admin-theme-control"><ThemeSelect /></div>}{children}</>;
}
