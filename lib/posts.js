import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "src/blog/posts");

function formatPost(fileName) {
  const { data, content } = matter(fs.readFileSync(path.join(postsDirectory, fileName), "utf8"));
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date);
  const updated = data.updated ? (data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : String(data.updated)) : null;
  const [year, month, day] = date.split("-");
  const slug = fileName.replace(/\.md$/, "");
  let body = content;
  body = body.replace(/<Badge text="([^"]+)"(?: type="warning")?[^>]*\/>/g, '<span class="badge">$1</span>').replace(/<style[\s\S]*?<\/style>/g, "");
  const publishedAt = data.publishedAt instanceof Date ? data.publishedAt.toISOString() : typeof data.publishedAt === "string" ? data.publishedAt : null;
  return { title: data.title, description: data.description, author: data.author, image: data.image || null, imageAlt: data.imageAlt || data.title, featured: data.featured === true, status: data.status, date, updated, publishedAt, tags: data.tags || [], slug, path: `/${year}/${month}/${day}/${slug}/`, content: body };
}

export function getAllPosts() { return fs.readdirSync(postsDirectory).filter((file) => file.endsWith(".md")).map(formatPost).sort((a, b) => b.date.localeCompare(a.date)); }
export function getPosts() { return getAllPosts().filter((post) => post.status === "published"); }
export function selectFeaturedPost(posts) { return posts.find((post) => post.featured) || posts[0]; }
export function getPost(params) { return getPosts().find((post) => post.path === `/${params.year}/${params.month}/${params.day}/${params.slug}/`); }
export const siteUrl = "https://truongphan.com";
