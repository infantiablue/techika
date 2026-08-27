import assert from "node:assert/strict";
import test from "node:test";
import { createSession, verifyPassword, verifySession } from "../lib/admin-auth.js";
import { mediaRules, validateArticle, validateImage } from "../lib/github-media.js";
import { readArticleDrafts, removeArticleDraft, saveArticleDraft } from "../lib/article-drafts.js";
import { coverSize } from "../lib/media-rules.js";

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

test("cover updates preserve frontmatter and require safe media paths", () => {
  const source = "---\ntitle: Hello\nimage: \n---\nBody\n";
  const updated = mediaRules.updateCover(source, "/media/hello/cover.png", "A cover");
  assert.match(updated, /image: \/media\/hello\/cover\.png/);
  assert.match(updated, /imageAlt: A cover/);
  assert.equal(mediaRules.validateImagePath("/media/hello/cover.png"), "public/media/hello/cover.png");
  assert.throws(() => mediaRules.validateImagePath("https://example.com/cover.png"));
});

test("article metadata validates and preserves Markdown body", () => {
  const article = validateArticle({ slug: "hello-world", title: "Hello", description: "A description", author: "Truong", date: "2026-08-27", tags: ["writing"], image: "/media/hello-world/cover.png", imageAlt: "A cover", content: "# Hello\n\nBody" }, { newArticle: true });
  const source = mediaRules.articleSource(article);
  assert.match(source, /type: article/);
  assert.equal(mediaRules.articleFromSource("hello-world", source).content, "# Hello\n\nBody");
  assert.throws(() => validateArticle({ ...article, slug: "Bad slug" }, { newArticle: true }));
  assert.throws(() => validateArticle({ ...article, imageAlt: "" }, { newArticle: true }));
});

test("local-only articles are included without replacing published articles", () => {
  const published = [{ slug: "published", title: "Remote" }];
  const local = [{ slug: "published", title: "Local copy", localDraft: true }, { slug: "untracked", title: "Local draft", localDraft: true }];
  assert.deepEqual(mediaRules.mergeLocalArticles(published, local), [published[0], local[1]]);
});

test("browser drafts save, load, and remove without publishing", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  saveArticleDraft(storage, "draft-1", { article: { title: "Draft" }, updatedAt: "2026-08-27T00:00:00.000Z" });
  assert.equal(readArticleDrafts(storage)["draft-1"].article.title, "Draft");
  removeArticleDraft(storage, "draft-1");
  assert.deepEqual(readArticleDrafts(storage), {});
});
