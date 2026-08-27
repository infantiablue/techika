import { Footer, Header } from "../../components/site";
import { PostList } from "../../components/post-list";
import { getPosts } from "../../lib/posts";
export const metadata = { title: "Writing", description: "Articles by Truong Phan about web development, JavaScript, Vue, React, and programming projects.", alternates: { canonical: "/blog/" }, openGraph: { url: "/blog/" } };
export default function Blog() { return <><Header /><main className="page" id="main-content"><h1>Writing</h1><PostList posts={getPosts()} /></main><Footer /></>; }
