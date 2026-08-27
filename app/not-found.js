import Link from "next/link";
import { Header } from "../components/site";
export default function NotFound() { return <><Header /><main className="page" id="main-content"><h1>404</h1><blockquote>Looks like we&apos;ve got some broken links.</blockquote><Link href="/">Take me home.</Link></main></>; }
