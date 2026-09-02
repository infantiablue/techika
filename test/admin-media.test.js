import assert from "node:assert/strict";
import test from "node:test";
import { createSession, verifyPassword, verifySession } from "../lib/admin-auth.js";
import { mediaRules, uploadImage, validateArticle, validateImage } from "../lib/github-media.js";
import { readArticleDrafts, removeArticleDraft, saveArticleDraft } from "../lib/article-drafts.js";
import { coverSize } from "../lib/media-rules.js";
import { filterMedia } from "../lib/media-rules.js";
import { imageOptimizationRules, optimizedDimensions, shouldUseOptimized } from "../lib/image-optimize.js";
import { selectFeaturedPost } from "../lib/posts.js";

test("admin sessions expire and reject tampering", () => {
  const session = createSession("secret", 0);
  assert.equal(verifySession(session, "secret", 1), true);
  assert.equal(verifySession(`${session}x`, "secret", 1), false);
  assert.equal(verifySession(session, "secret", 9 * 60 * 60 * 1000), false);
});

test("password comparison and image validation accept only supported uploads", () => {
  assert.deepEqual(coverSize, { width: 1200, height: 675 });
  assert.equal(verifyPassword("correct", "correct"), true);
  assert.equal(verifyPassword("wrong", "correct"), false);
  assert.equal(validateImage({ type: "image/png", size: 10 }), "png");
  assert.throws(() => validateImage({ type: "image/svg+xml", size: 10 }));
  assert.throws(() => validateImage({ type: "image/png", size: 11 * 1024 * 1024 }));
});

test("standalone uploads use the reusable library and cover uploads require context", async () => {
  assert.equal(mediaRules.mediaUploadPath("", "Hero Image.png", "png", "asset-1"), "public/media/library/asset-1-hero-image.png");
  assert.equal(mediaRules.mediaUploadPath("hello-world", "Hero Image.png", "png", "asset-1"), "public/media/hello-world/asset-1-hero-image.png");
  await assert.rejects(() => uploadImage({ file: { type: "image/png", size: 1, name: "hero.png" }, setCover: true }), /Select an article/);
});

test("image optimization bounds dimensions and only keeps meaningful savings", () => {
  assert.deepEqual(imageOptimizationRules, { bodyBounds: { width: 1920, height: 2560 }, maxImageBytes: 10 * 1024 * 1024, minimumSaving: 0.1, quality: 0.88, outputType: "image/jpeg" });
  assert.deepEqual(optimizedDimensions(4000, 2000), { width: 1920, height: 960 });
  assert.deepEqual(optimizedDimensions(600, 400), { width: 600, height: 400 });
  assert.deepEqual(optimizedDimensions(2400, 1350, true), { width: 1200, height: 675 });
  assert.equal(shouldUseOptimized(1000, 900), true);
  assert.equal(shouldUseOptimized(1000, 901), false);
});

test("media catalog derives readable names, usage, eligibility, and filters", () => {
  const path = "public/media/hello-world/123e4567-e89b-12d3-a456-426614174000-hero.png";
  const posts = [{ article: { slug: "hello-world", title: "Hello", image: "/media/hello-world/123e4567-e89b-12d3-a456-426614174000-hero.png" }, content: "Body" }];
  const [item] = mediaRules.mediaFromTree([{ type: "blob", path, size: 2 * 1024 * 1024 }], posts);
  assert.equal(item.displayName, "hero.png");
  assert.equal(item.status, "cover");
  assert.equal(item.coverEligible, true);
  assert.equal(item.optimizable, true);
  assert.deepEqual(item.article, { slug: "hello-world", title: "Hello" });
  assert.equal(filterMedia([item], { filter: "article", query: "hero", articleSlug: "hello-world" }).length, 1);
  assert.equal(filterMedia([item], { filter: "unused", query: "", articleSlug: "" }).length, 0);
});

test("media added time sorts newest assets first with a stable fallback", () => {
  const media = mediaRules.sortMediaByAddedAt([{ path: "/media/old.png", addedAt: "2026-08-01T00:00:00Z" }, { path: "/media/new.png", addedAt: "2026-09-01T00:00:00Z" }, { path: "/media/unknown-b.png", addedAt: "" }, { path: "/media/unknown-a.png", addedAt: "" }]);
  assert.deepEqual(media.map((item) => item.path), ["/media/new.png", "/media/old.png", "/media/unknown-a.png", "/media/unknown-b.png"]);
});

test("media replacement updates relative and absolute references", () => {
  const oldImage = "/media/hello/old.png";
  const source = `---\nimage: ${oldImage}\n---\n![Body](${oldImage})\nhttps://truongphan.com${oldImage}`;
  const updated = mediaRules.replaceMediaReferences(source, oldImage, "/media/hello/new.webp");
  assert.doesNotMatch(updated, /old\.png/);
  assert.equal(updated.match(/new\.webp/g).length, 3);
});

test("cover updates preserve frontmatter and require safe media paths", () => {
  const source = "---\ntitle: Hello\nimage: \n---\nBody\n";
  const updated = mediaRules.updateCover(source, "/media/hello/cover.png", "A cover");
  assert.match(updated, /image: \/media\/hello\/cover\.png/);
  assert.match(updated, /imageAlt: A cover/);
  assert.equal(mediaRules.validateImagePath("/media/hello/cover.png"), "public/media/hello/cover.png");
  assert.equal(mediaRules.validateImagePath("/media/hello/diagram.svg", { allowSvg: true }), "public/media/hello/diagram.svg");
  assert.throws(() => mediaRules.validateImagePath("/media/hello/diagram.svg"));
  assert.throws(() => mediaRules.validateImagePath("https://example.com/cover.png"));
});

test("article metadata validates status and preserves Markdown body", () => {
  const article = validateArticle({ slug: "hello-world", title: "Hello", description: "A description", author: "Truong", date: "2026-08-27", status: "published", tags: ["writing"], image: "/media/hello-world/cover.png", imageAlt: "A cover", featured: true, content: "# Hello\n\nBody" }, { newArticle: true });
  const source = mediaRules.articleSource(article);
  assert.match(source, /type: article/);
  assert.match(source, /status: published/);
  assert.equal(mediaRules.articleFromSource("hello-world", source).status, "published");
  assert.equal(mediaRules.articleFromSource("legacy", "---\ntitle: Legacy\n---\nBody").status, "published");
  assert.equal(mediaRules.articleFromSource("hello-world", source).featured, true);
  assert.equal(mediaRules.articleFromSource("hello-world", source).content, "# Hello\n\nBody");
  assert.deepEqual(validateArticle({ ...article, tags: ["writing", ""] }, { newArticle: true }).tags, ["writing"]);
  assert.doesNotMatch(mediaRules.clearFeatured(source), /featured:/);
  assert.throws(() => validateArticle({ ...article, slug: "Bad slug" }, { newArticle: true }));
  assert.throws(() => validateArticle({ ...article, status: "private" }, { newArticle: true }), /Select Draft or Published/);
  assert.throws(() => validateArticle({ ...article, status: "draft" }, { newArticle: true }), /Only published articles can be featured/);
  assert.doesNotThrow(() => validateArticle({ ...article, image: "https://storage.googleapis.com/techika-media/images/cover.png" }, { newArticle: true }));
  assert.throws(() => validateArticle({ ...article, image: "https://example.com/cover.png" }, { newArticle: true }), /allowed Google Cloud URL/);
  assert.throws(() => validateArticle({ ...article, imageAlt: "" }, { newArticle: true }));
  assert.throws(() => validateArticle({ ...article, image: "", imageAlt: "" }, { newArticle: true }));
});

test("local-only articles are included without replacing published articles", () => {
  const published = [{ slug: "published", title: "Remote" }];
  const local = [{ slug: "published", title: "Local copy", localDraft: true }, { slug: "untracked", title: "Local draft", localDraft: true }];
  assert.deepEqual(mediaRules.mergeLocalArticles(published, local), [published[0], local[1]]);
});

test("homepage selects the marked article and falls back to the newest post", () => {
  const posts = [{ slug: "newest", featured: false }, { slug: "chosen", featured: true }];
  assert.equal(selectFeaturedPost(posts).slug, "chosen");
  assert.equal(selectFeaturedPost(posts.map((post) => ({ ...post, featured: false }))).slug, "newest");
});

test("browser drafts save, load, and remove without publishing", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  saveArticleDraft(storage, "draft-1", { article: { title: "Draft", tags: ["writing", ""] }, updatedAt: "2026-08-27T00:00:00.000Z" });
  assert.equal(readArticleDrafts(storage)["draft-1"].article.title, "Draft");
  assert.equal(readArticleDrafts(storage)["draft-1"].article.status, "draft");
  assert.deepEqual(readArticleDrafts(storage)["draft-1"].article.tags, ["writing", ""]);
  removeArticleDraft(storage, "draft-1");
  assert.deepEqual(readArticleDrafts(storage), {});
});
