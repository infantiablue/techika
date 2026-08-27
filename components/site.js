import Link from "next/link";
import { ThemeSelect } from "./theme-select";
import { PublicNav } from "./public-nav";

export function Header() { return <header className="navbar"><Link className="brand" href="/">Truong Phan</Link><PublicNav /><ThemeSelect /></header>; }
export function Footer() { return <footer className="footer">© 2021 Made with 🧡</footer>; }
