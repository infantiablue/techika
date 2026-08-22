import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPosts } from "../lib/posts.js";

const posts = getPosts();
assert.equal(posts.length, 8, "all eight Markdown posts must be present");
assert.equal(new Set(posts.map((post) => post.path)).size, posts.length, "post URLs must be unique");
for (const post of posts) {
  assert.ok(post.title && post.date && post.author && post.content.trim(), `${post.slug} is missing required content`);
  assert.match(post.path, /^\/\d{4}\/\d{2}\/\d{2}\/.+\/$/, `${post.slug} has an invalid dated route`);
}
for (const page of ["projects", "contact", "credits"]) {
  assert.ok(fs.statSync(path.join(process.cwd(), "src", `${page}.md`)).size > 0, `${page} content is missing`);
}
for (const asset of ["assets/img/header.jpg", "favicon.ico", "favicon.png", "media/vhnews-tutorials/banner.jpg", "media/vhnews-tutorials-p2/darkmode.png", "media/simple-notes-javascript/js-object-cheatsheet.jpg"]) {
  assert.ok(fs.existsSync(path.join(process.cwd(), "public", asset)), `${asset} is missing`);
}
console.log(`Verified ${posts.length} Markdown posts, three static pages, and public assets.`);
