import { getPosts, siteUrl } from "../lib/posts";
export default function sitemap() { return ["", "/blog/", "/projects/", "/contact/", "/credits/"].map((path) => ({ url: `${siteUrl}${path}` })).concat(getPosts().map((post) => ({ url: `${siteUrl}${post.path}`, lastModified: new Date(`${post.updated || post.date}T00:00:00Z`) }))); }
