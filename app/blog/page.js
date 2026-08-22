import { Footer, Header, Newsletter } from "../../components/site";
import { PostList } from "../../components/post-list";
import { getPosts } from "../../lib/posts";
export const metadata = { title: "Blog", alternates: { canonical: "/blog/" } };
export default function Blog() { return <><Header /><main className="page"><PostList posts={getPosts()} /><Newsletter /></main><Footer /></>; }
