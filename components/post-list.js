import Link from "next/link";
import Image from "next/image";
import { coverSize } from "../lib/media-rules";
function readableDate(date) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)); }
export function PostList({ posts, compact = false }) { return <div className={compact ? "headline-list" : "post-list"}>{posts.map((post) => <article key={post.path}><h2><Link href={post.path}>{post.title}</Link></h2>{!compact && <p className="byline">📅 {readableDate(post.date)} · ✍️ {post.author}</p>}{!compact && post.image && <Link href={post.path} aria-label={`Read ${post.title}`}><Image src={post.image} alt="" {...coverSize} sizes="(max-width: 1152px) 83vw, 960px" /></Link>}{!compact && <p>{post.description}</p>}</article>)}</div>; }
