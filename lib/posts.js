import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "src/blog/posts");

function formatPost(fileName) {
  const { data, content } = matter(fs.readFileSync(path.join(postsDirectory, fileName), "utf8"));
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date);
  const [year, month, day] = date.split("-");
  const slug = fileName.replace(/\.md$/, "");
  let body = content;
  body = body.replace(/<Badge text="([^"]+)"(?: type="warning")?[^>]*\/>/g, '<span class="badge">$1</span>').replace(/<style[\s\S]*?<\/style>/g, "");
  return { title: data.title, description: data.description, author: data.author, image: data.image || null, date, tags: data.tags || [], slug, path: `/${year}/${month}/${day}/${slug}/`, content: body };
}

export function getPosts() { return fs.readdirSync(postsDirectory).filter((file) => file.endsWith(".md")).map(formatPost).sort((a, b) => b.date.localeCompare(a.date)); }
export function getPost(params) { return getPosts().find((post) => post.path === `/${params.year}/${params.month}/${params.day}/${params.slug}/`); }
export const siteUrl = "https://truongphan.com";
