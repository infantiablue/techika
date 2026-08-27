"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminSignOut } from "./admin-sign-out";
import { ThemeSelect } from "./theme-select";

const sections = [
	{ id: "dashboard", href: "/admin/", label: "Dashboard" },
	{ id: "articles", href: "/admin/articles/", label: "Articles" },
	{ id: "media", href: "/admin/media/", label: "Media" },
];

export function AdminNav() {
	const pathname = usePathname();
	const active = pathname.startsWith("/admin/media")
		? "media"
		: pathname.startsWith("/admin/articles") || pathname.startsWith("/admin/edit")
			? "articles"
			: "dashboard";

	return (
		<header className='admin-global-nav'>
			<div className='admin-global-nav-inner'>
				<Link className='admin-global-brand' href='/admin/' aria-label='Techika admin dashboard'>
					<strong>TruongPhan</strong>
					<span>Publishing</span>
				</Link>
				<nav className='admin-global-links' aria-label='Admin navigation'>
					{sections.map((section) => (
						<Link href={section.href} key={section.id} aria-current={active === section.id ? "page" : undefined}>
							{section.label}
						</Link>
					))}
				</nav>
				<div className='admin-global-actions'>
					<Link className='admin-nav-site' href='/'>
						View site
					</Link>
					<ThemeSelect />
					<AdminSignOut />
				</div>
			</div>
		</header>
	);
}
