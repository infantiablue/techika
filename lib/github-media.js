import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const imageTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"]]);
const maxImageBytes = 10 * 1024 * 1024;

export class ConflictError extends Error {}

function config() {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_BRANCH = "main" } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) throw new Error("GitHub publishing is not configured.");
  if (!/^[\w.-]+\/[\w.-]+$/.test(GITHUB_REPOSITORY) || !/^[\w./-]+$/.test(GITHUB_BRANCH)) throw new Error("GitHub publishing configuration is invalid.");
  return { token: GITHUB_TOKEN, repository: GITHUB_REPOSITORY, branch: GITHUB_BRANCH };
}

async function github(path, options = {}) {
  const { token, repository } = config();
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...options,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...options.headers },
    cache: "no-store",
  });
  if (response.status === 409 || response.status === 422) throw new ConflictError("The publishing branch changed. Reload and try again.");
  if (!response.ok) throw new Error(`GitHub publishing failed (${response.status}).`);
  return response.json();
}

function decode(content) { return Buffer.from(content, "base64").toString("utf8"); }
function mediaUrl(path) { return `/${path.slice("public/".length)}`; }
function safeFileName(name) { return name.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "image"; }
function mediaUploadPath(slug, fileName, extension, id = randomUUID()) { const directory = typeof slug === "string" && slug.trim() ? slug.trim() : "library"; return `public/media/${directory}/${id}-${safeFileName(fileName)}.${extension}`; }
function postPath(slug) { return `src/blog/posts/${slug}.md`; }
const articleSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const localPostsDirectory = path.join(process.cwd(), "src", "blog", "posts");

async function getRef() {
  const { branch } = config();
  const ref = await github(`/git/ref/heads/${encodeURIComponent(branch)}`);
  const commit = await github(`/git/commits/${ref.object.sha}`);
  const tree = await github(`/git/trees/${commit.tree.sha}?recursive=1`);
  return { refSha: ref.object.sha, commitSha: commit.sha, treeSha: commit.tree.sha, tree: tree.tree };
}

async function getBlob(sha) { return github(`/git/blobs/${sha}`); }

async function postRecordsFromTree(tree) {
  const files = tree.filter((entry) => entry.type === "blob" && /^src\/blog\/posts\/[^/]+\.md$/.test(entry.path));
  return Promise.all(files.map(async (entry) => {
    const source = decode((await getBlob(entry.sha)).content);
    const parsed = matter(source);
    const slug = entry.path.split("/").pop().replace(/\.md$/, "");
    const date = parsed.data.date instanceof Date ? parsed.data.date.toISOString().slice(0, 10) : String(parsed.data.date);
    return { source, content: parsed.content, article: { slug, path: entry.path, title: parsed.data.title, description: parsed.data.description || "", date, status: parsed.data.status === "draft" ? "draft" : "published", image: parsed.data.image || "", imageAlt: parsed.data.imageAlt || parsed.data.title, featured: parsed.data.featured === true } };
  }));
}

async function postsFromTree(tree) { return (await postRecordsFromTree(tree)).map((record) => record.article); }

function displayName(name) {
  return name.replace(/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-)+/i, "");
}

function mediaFromTree(tree, posts) {
  const articles = new Map(posts.map(({ article }) => [article.slug, article]));
  return tree.filter((entry) => entry.type === "blob" && entry.path.startsWith("public/media/")).map((entry) => {
    const image = mediaUrl(entry.path);
    const name = entry.path.split("/").pop();
    const folder = entry.path.split("/").at(-2);
    const extension = name.split(".").pop().toLowerCase();
    const usages = posts.flatMap(({ article, content }) => {
      const result = [];
      if (article.image === image) result.push({ slug: article.slug, title: article.title, role: "cover" });
      if (content.includes(image) || content.includes(`https://truongphan.com${image}`)) result.push({ slug: article.slug, title: article.title, role: "body" });
      return result;
    });
    const article = articles.get(folder) || (usages.length === 1 ? articles.get(usages[0].slug) : null);
    const shared = folder === "library" || new Set(usages.map((usage) => usage.slug)).size > 1;
    const status = !usages.length ? "unused" : shared ? "shared" : usages.some((usage) => usage.role === "cover") ? "cover" : "body";
    return { path: image, name, displayName: displayName(name), size: entry.size, extension, folder, article: article ? { slug: article.slug, title: article.title } : null, usages, status, coverEligible: ["jpg", "jpeg", "png", "webp", "gif"].includes(extension), optimizable: ["jpg", "jpeg", "png"].includes(extension) && entry.size > 1024 * 1024 };
  }).sort((a, b) => (a.article?.title || a.folder).localeCompare(b.article?.title || b.folder) || a.displayName.localeCompare(b.displayName));
}

function sortMediaByAddedAt(media) {
  return [...media].sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || "") || a.path.localeCompare(b.path));
}

async function mediaAddedAt(mediaPath) {
  try {
    const commits = await github(`/commits?path=${encodeURIComponent(mediaPath)}&per_page=1`);
    return commits[0]?.commit?.committer?.date || "";
  } catch {
    return "";
  }
}

async function mediaFromTreeByAddedAt(tree, posts) {
  const media = mediaFromTree(tree, posts);
  return sortMediaByAddedAt(await Promise.all(media.map(async (item) => ({ ...item, addedAt: await mediaAddedAt(`public${item.path}`) }))));
}

function articleFromSource(slug, source) {
  const parsed = matter(source);
  const date = parsed.data.date instanceof Date ? parsed.data.date.toISOString().slice(0, 10) : String(parsed.data.date || "");
  return { slug, title: parsed.data.title || "", description: parsed.data.description || "", author: parsed.data.author || "", date, status: parsed.data.status === "draft" ? "draft" : "published", tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [], image: parsed.data.image || "", imageAlt: parsed.data.imageAlt || "", featured: parsed.data.featured === true, content: parsed.content.trim() };
}

async function localArticles() {
  let entries;
  try { entries = await readdir(localPostsDirectory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  return Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md") && articleSlug.test(entry.name.slice(0, -3))).map(async (entry) => {
    const slug = entry.name.slice(0, -3);
    const { content, ...article } = articleFromSource(slug, await readFile(path.join(localPostsDirectory, entry.name), "utf8"));
    return { ...article, path: postPath(slug), localDraft: true };
  }));
}

function mergeLocalArticles(articles, local) {
  const published = new Set(articles.map((article) => article.slug));
  return [...articles, ...local.filter((article) => !published.has(article.slug))];
}

export async function getAdminState() {
  const { tree } = await getRef();
  const [posts, local] = await Promise.all([postRecordsFromTree(tree), localArticles()]);
  const articles = posts.map((record) => record.article);
  return { articles: mergeLocalArticles(articles, local).sort((a, b) => b.date.localeCompare(a.date)), media: await mediaFromTreeByAddedAt(tree, posts) };
}

export async function getArticle(slug) {
  if (!articleSlug.test(slug)) throw new Error("Article not found.");
  const current = await getRef();
  const entry = current.tree.find((item) => item.path === postPath(slug));
  if (entry) return articleFromSource(slug, decode((await getBlob(entry.sha)).content));
  try { return { ...articleFromSource(slug, await readFile(path.join(localPostsDirectory, `${slug}.md`), "utf8")), localDraft: true }; }
  catch (error) { if (error.code === "ENOENT") throw new Error("Article not found."); throw error; }
}

export function validateImage(file) {
  if (!file || !imageTypes.has(file.type)) throw new Error("Upload a JPEG, PNG, WebP, or GIF image.");
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > maxImageBytes) throw new Error("Images must be between 1 byte and 10 MiB.");
  return imageTypes.get(file.type);
}

function validateImagePath(image, { allowSvg = false } = {}) {
  const supportedPath = allowSvg ? /^\/media\/[a-zA-Z0-9_./-]+\.(jpg|png|webp|gif|svg)$/ : /^\/media\/[a-zA-Z0-9_./-]+\.(jpg|png|webp|gif)$/;
  if (typeof image !== "string" || !supportedPath.test(image)) throw new Error("Select an image from the media library.");
  return `public${image}`;
}

function updateCover(source, image, imageAlt) {
  if (typeof imageAlt !== "string" || !imageAlt.trim()) throw new Error("Cover alt text is required.");
  const parsed = matter(source);
  return matter.stringify(parsed.content, { ...parsed.data, image, imageAlt: imageAlt.trim() });
}

function replaceMediaReferences(source, oldImage, newImage) {
  return source.split(oldImage).join(newImage);
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function validCoverImage(value) {
  return !value || /^\/media\/[a-zA-Z0-9_./-]+\.(jpg|png|webp|gif)$/.test(value) || /^https:\/\/storage\.googleapis\.com\/techika-media\/[^\s]+$/.test(value);
}

export function validateArticle(input, { existingSlug = "", newArticle = false } = {}) {
  const article = {
    slug: typeof input?.slug === "string" ? input.slug.trim() : "",
    title: typeof input?.title === "string" ? input.title.trim() : "",
    description: typeof input?.description === "string" ? input.description.trim() : "",
    author: typeof input?.author === "string" ? input.author.trim() : "",
    date: typeof input?.date === "string" ? input.date : "",
    tags: Array.isArray(input?.tags) ? input.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    image: typeof input?.image === "string" ? input.image.trim() : "",
    imageAlt: typeof input?.imageAlt === "string" ? input.imageAlt.trim() : "",
    status: input?.status,
    featured: input?.featured === true,
    content: typeof input?.content === "string" ? input.content.trim() : "",
  };
  if (newArticle && !articleSlug.test(article.slug)) throw new Error("Use a lowercase, hyphen-separated URL slug.");
  if (!newArticle && article.slug !== existingSlug) throw new Error("Existing article URLs cannot be changed.");
  if (!article.title || !article.description || !article.author || !validDate(article.date) || !article.content) throw new Error("Title, description, author, date, and Markdown body are required.");
  if (article.status !== "draft" && article.status !== "published") throw new Error("Select Draft or Published.");
  if (!validCoverImage(article.image)) throw new Error("Cover image must be a media-library path or an allowed Google Cloud URL.");
  if (article.image && !article.imageAlt) throw new Error("Cover alt text is required.");
  if (article.featured && !article.image) throw new Error("Featured articles require a cover image.");
  if (article.featured && article.status !== "published") throw new Error("Only published articles can be featured.");
  return article;
}

function articleSource(article) {
  const data = { title: article.title, description: article.description, author: article.author, type: "article", status: article.status, image: article.image, date: article.date, tags: article.tags };
  if (article.imageAlt) data.imageAlt = article.imageAlt;
  if (article.featured) data.featured = true;
  return matter.stringify(`${article.content}\n`, data);
}

function clearFeatured(source) {
  const parsed = matter(source);
  if (parsed.data.featured !== true) return "";
  delete parsed.data.featured;
  return matter.stringify(parsed.content, parsed.data);
}

async function commitChanges(changes, message, current = null) {
  current ||= await getRef();
  const treeEntries = await Promise.all(changes.map(async ({ path, content, remove }) => {
    if (remove) return { path, mode: "100644", type: "blob", sha: null };
    const blob = await github("/git/blobs", { method: "POST", body: JSON.stringify({ content: Buffer.from(content).toString("base64"), encoding: "base64" }), headers: { "Content-Type": "application/json" } });
    return { path, mode: "100644", type: "blob", sha: blob.sha };
  }));
  const tree = await github("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: current.treeSha, tree: treeEntries }), headers: { "Content-Type": "application/json" } });
  const commit = await github("/git/commits", { method: "POST", body: JSON.stringify({ message, tree: tree.sha, parents: [current.commitSha] }), headers: { "Content-Type": "application/json" } });
  const { branch } = config();
  await github(`/git/refs/heads/${encodeURIComponent(branch)}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }), headers: { "Content-Type": "application/json" } });
  return commit.sha;
}

async function currentPostSource(slug, tree) {
  const entry = tree.find((item) => item.path === postPath(slug));
  if (!entry) throw new Error("Article not found.");
  return decode((await getBlob(entry.sha)).content);
}

export async function saveArticle(input) {
  const current = await getRef();
  const existingSlug = typeof input?.existingSlug === "string" ? input.existingSlug : "";
  const existing = existingSlug && current.tree.find((entry) => entry.path === postPath(existingSlug));
  if (existingSlug && !existing) throw new Error("Article not found.");
  const article = validateArticle(input, { existingSlug, newArticle: !existing });
  if (!existing && current.tree.some((entry) => entry.path === postPath(article.slug))) throw new Error("An article already uses this URL slug.");
  const changes = [{ path: postPath(article.slug), content: articleSource(article) }];
  if (article.featured) {
    const previous = await Promise.all(current.tree.filter((entry) => entry.type === "blob" && /^src\/blog\/posts\/[^/]+\.md$/.test(entry.path) && entry.path !== postPath(article.slug)).map(async (entry) => {
      const content = clearFeatured(decode((await getBlob(entry.sha)).content));
      return content ? { path: entry.path, content } : null;
    }));
    changes.push(...previous.filter(Boolean));
  }
  const commit = await commitChanges(changes, `article: ${existing ? "update" : "publish"} ${article.slug}`, current);
  return { commit, article, state: await getAdminState() };
}

export async function uploadImage({ file, slug, setCover, imageAlt }) {
  const extension = validateImage(file);
  const targetSlug = typeof slug === "string" ? slug.trim() : "";
  if (setCover && !targetSlug) throw new Error("Select an article before setting a cover.");
  const current = await getRef();
  if (targetSlug && (!articleSlug.test(targetSlug) || !(await postsFromTree(current.tree)).some((article) => article.slug === targetSlug))) throw new Error("Article not found.");
  const path = mediaUploadPath(targetSlug, file.name, extension);
  const changes = [{ path, content: Buffer.from(await file.arrayBuffer()) }];
  if (setCover) {
    changes.push({ path: postPath(targetSlug), content: updateCover(await currentPostSource(targetSlug, current.tree), mediaUrl(path), imageAlt) });
  }
  const commit = await commitChanges(changes, `media: upload ${file.name}`, current);
  return { commit, image: mediaUrl(path), state: await getAdminState() };
}

export async function setCover({ slug, image, imageAlt }) {
  const path = validateImagePath(image);
  const current = await getRef();
  if (!current.tree.some((entry) => entry.path === path)) throw new Error("Image not found.");
  const commit = await commitChanges([{ path: postPath(slug), content: updateCover(await currentPostSource(slug, current.tree), image, imageAlt) }], `media: update ${slug} cover`, current);
  return { commit, state: await getAdminState() };
}

export async function replaceImage({ file, image }) {
  const extension = validateImage(file);
  const oldPath = validateImagePath(image, { allowSvg: true });
  const current = await getRef();
  if (!current.tree.some((entry) => entry.path === oldPath)) throw new Error("Image not found.");
  const directory = path.posix.dirname(oldPath).slice("public/media/".length);
  const newPath = mediaUploadPath(directory, file.name, extension);
  const newImage = mediaUrl(newPath);
  const posts = await postRecordsFromTree(current.tree);
  const changes = [{ path: newPath, content: Buffer.from(await file.arrayBuffer()) }, { path: oldPath, remove: true }];
  for (const { article, source } of posts) {
    if (source.includes(image)) changes.push({ path: article.path, content: replaceMediaReferences(source, image, newImage) });
  }
  const commit = await commitChanges(changes, `media: replace ${oldPath.split("/").pop()}`, current);
  return { commit, image: newImage, state: await getAdminState() };
}

export async function deleteImage(image) {
  const path = validateImagePath(image, { allowSvg: true });
  const current = await getRef();
  if (!current.tree.some((entry) => entry.path === path)) throw new Error("Image not found.");
  const sources = await postsFromTree(current.tree);
  const referenced = sources.some((post) => post.image === image);
  if (referenced) throw new Error("This image is still used as an article cover.");
  const markdown = await Promise.all(current.tree.filter((entry) => entry.type === "blob" && /^src\/blog\/posts\/[^/]+\.md$/.test(entry.path)).map(async (entry) => decode((await getBlob(entry.sha)).content)));
  if (markdown.some((source) => source.includes(image) || source.includes(`https://truongphan.com${image}`))) throw new Error("This image is still referenced by an article.");
  const commit = await commitChanges([{ path, remove: true }], `media: delete ${path.split("/").pop()}`, current);
  return { commit, state: await getAdminState() };
}

export const mediaRules = { maxImageBytes, updateCover, validateImagePath, articleFromSource, articleSource, mergeLocalArticles, clearFeatured, mediaUploadPath, mediaFromTree, replaceMediaReferences, sortMediaByAddedAt };
