import { getPosts, siteUrl } from "../lib/posts";
export default function sitemap() { return ["", "/blog/", "/posts/", "/projects", "/contact", "/credits"].map((path) => ({ url: `${siteUrl}${path}`, lastModified: new Date() })).concat(getPosts().map((post) => ({ url: `${siteUrl}${post.path}`, lastModified: new Date(`${post.date}T00:00:00Z`) }))); }
