import "./globals.css";
import "./home-fidelity.css";
import "./theme.css";
import { GoogleAnalytics } from "@next/third-parties/google";
export const metadata = { metadataBase: new URL("https://truongphan.com"), title: { default: "Truong Phan's Personal Blog", template: "%s | Truong Phan's Personal Blog" }, description: "My awesome personal site about web development and hobbies", alternates: { canonical: "/" }, openGraph: { type: "website", siteName: "Truong Phan's Personal Blog" }, twitter: { card: "summary_large_image", creator: "@infantiablue" } };
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 5, themeColor: "#111827" };
export default function RootLayout({ children }) { return <html lang="en"><body>{children}<GoogleAnalytics gaId="G-N5GN92FFNF" /></body></html>; }
