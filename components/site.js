import Link from "next/link";

const navigation = <><Link href="/">Home</Link><Link href="/blog/">Blog</Link><Link href="/projects">Projects</Link><Link href="/contact">Contact</Link></>;
export function Header() { return <header className="navbar"><details className="mobile-nav"><summary aria-label="Open navigation">☰</summary><nav aria-label="Mobile navigation">{navigation}</nav></details><nav className="desktop-nav" aria-label="Main navigation">{navigation}</nav></header>; }
export function Newsletter() { return <section className="newsletter" aria-label="Newsletter signup"><form action="https://www.getrevue.co/profile/techika/add_subscriber" method="post" target="_blank"><h3>Meet Techika Newsletter with useful content on web development.</h3><div><input type="email" name="member[email]" placeholder="Your email address..." aria-label="Email address" required /><button type="submit" name="member[subscribe]">Subscribe</button><span>Once a month. Unsubscribe anytime.</span></div></form></section>; }
export function Footer() { return <footer className="footer">© 2021 Made with 🧡</footer>; }
