"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
	{ href: "/blog/", label: "Writing", matches: (path) => path === "/blog" || path.startsWith("/blog/") || path === "/posts" || path.startsWith("/posts/") || /^\/\d{4}\/\d{2}\/\d{2}\//.test(path) },
	{ href: "/projects", label: "Projects", matches: (path) => path === "/projects" || path.startsWith("/projects/") },
	{ href: "/contact", label: "Contact", matches: (path) => path === "/contact" || path.startsWith("/contact/") },
];

function NavigationLinks({ pathname }) {
	return sections.map(({ href, label, matches }) => <Link href={href} key={href} aria-current={matches(pathname) ? "page" : undefined}>{label}</Link>);
}

export function PublicNav() {
	const pathname = usePathname().replace(/\/+$/, "") || "/";
	return <>
		<details className="mobile-nav"><summary aria-label="Open navigation">☰</summary><nav aria-label="Mobile navigation"><NavigationLinks pathname={pathname} /></nav></details>
		<nav className="desktop-nav" aria-label="Main navigation"><NavigationLinks pathname={pathname} /></nav>
	</>;
}
