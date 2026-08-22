import Link from "next/link";
import { ThemeSelect } from "./theme-select";

const navigation = <><Link href="/">Home</Link><Link href="/blog/">Blog</Link><Link href="/projects">Projects</Link><Link href="/contact">Contact</Link></>;
export function Header() { return <header className="navbar"><details className="mobile-nav"><summary aria-label="Open navigation">☰</summary><nav aria-label="Mobile navigation">{navigation}</nav></details><nav className="desktop-nav" aria-label="Main navigation">{navigation}</nav><ThemeSelect /></header>; }
export function Footer() { return <footer className="footer">© 2021 Made with 🧡</footer>; }
