import { ThemeSelect } from "../../components/theme-select";

export const metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }) { return <><div className="admin-theme-control"><ThemeSelect /></div>{children}</>; }
