import "./globals.css";
import "./theme.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { JsonLd } from "../components/json-ld";
import { SparklingStars } from "../components/sparkling-stars";
const siteUrl = "https://truongphan.com";
export const metadata = { metadataBase: new URL(siteUrl), title: { default: "Truong Phan | Developer and Writer", template: "%s | Truong Phan" }, description: "Personal writing by Truong Phan on web development, JavaScript, Vue, React, and side projects.", alternates: { canonical: "/" }, openGraph: { type: "website", url: "/", siteName: "Truong Phan", title: "Truong Phan | Developer and Writer", description: "Personal writing on web development, JavaScript, Vue, React, and side projects.", images: ["/assets/img/header.jpg"] }, twitter: { card: "summary_large_image", creator: "@infantiablue", images: ["/assets/img/header.jpg"] } };
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 5, themeColor: "#111827" };
export default function RootLayout({ children }) { return <html lang="en"><body><SparklingStars />{children}<JsonLd data={{ "@context": "https://schema.org", "@graph": [{ "@type": "Person", "@id": `${siteUrl}/#person`, name: "Truong Phan", url: siteUrl, image: `${siteUrl}/assets/img/avatar.jpg`, sameAs: ["https://twitter.com/infantiablue", "https://github.com/infantiablue"] }, { "@type": "WebSite", "@id": `${siteUrl}/#website`, name: "Truong Phan", url: siteUrl, publisher: { "@id": `${siteUrl}/#person` } }] }} /><GoogleAnalytics gaId="G-SKQB1ZFXMY" /></body></html>; }
