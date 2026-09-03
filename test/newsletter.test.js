import assert from "node:assert/strict";
import test from "node:test";
import { confirmNewsletterSubscription, createConfirmationToken, createNewsletterDraft, createWeeklyNewsletterDraft, deleteNewsletterDraft, getNewsletterStudio, readConfirmationToken, selectWeeklyPosts, sendNewsletterDraft, validateNewsletterEmail, weeklyDigestHtml } from "../lib/newsletter.js";

test("newsletter confirmation tokens expire and reject tampering", () => {
  const token = createConfirmationToken("Reader@Example.com", "secret", 0);
  assert.equal(readConfirmationToken(token, "secret", 1), "reader@example.com");
  assert.throws(() => readConfirmationToken(`${token}x`, "secret", 1));
  assert.throws(() => readConfirmationToken(token, "secret", 24 * 60 * 60 * 1000 + 1));
  assert.throws(() => validateNewsletterEmail("not an email"));
});

test("confirmed subscribers are created in the configured segment", async () => {
  const previousFetch = global.fetch;
  const previousEnv = Object.fromEntries(["RESEND_API_KEY", "RESEND_SEGMENT_ID", "NEWSLETTER_CONFIRMATION_SECRET"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, { RESEND_API_KEY: "test-key", RESEND_SEGMENT_ID: "segment_test", NEWSLETTER_CONFIRMATION_SECRET: "secret" });
  let url; let body;
  global.fetch = async (requestUrl, options) => { url = requestUrl; body = JSON.parse(options.body); return new Response(JSON.stringify({ data: { id: "contact_test" } }), { status: 200 }); };
  try {
    await confirmNewsletterSubscription(createConfirmationToken("reader@example.com", "secret"));
    assert.equal(url, "https://api.resend.com/contacts");
    assert.deepEqual(body.segments, [{ id: "segment_test" }]);
  } finally { global.fetch = previousFetch; for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test("existing subscribers are added to the configured segment", async () => {
  const previousFetch = global.fetch;
  const previousEnv = Object.fromEntries(["RESEND_API_KEY", "RESEND_SEGMENT_ID", "NEWSLETTER_CONFIRMATION_SECRET"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, { RESEND_API_KEY: "test-key", RESEND_SEGMENT_ID: "segment_test", NEWSLETTER_CONFIRMATION_SECRET: "secret" });
  const urls = [];
  global.fetch = async (url) => { urls.push(url); return new Response(JSON.stringify({}), { status: urls.length === 1 ? 409 : 200 }); };
  try {
    await confirmNewsletterSubscription(createConfirmationToken("reader@example.com", "secret"));
    assert.deepEqual(urls, ["https://api.resend.com/contacts", "https://api.resend.com/contacts/reader%40example.com/segments/segment_test"]);
  } finally { global.fetch = previousFetch; for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test("weekly digests include only posts first published after the previous send", () => {
  const posts = [
    { title: "Old", description: "Old post", path: "/old/", publishedAt: "2026-08-01T00:00:00.000Z" },
    { title: "New <post>", description: "A & B", path: "/new/", publishedAt: "2026-09-01T00:00:00.000Z" },
    { title: "Legacy", description: "No timestamp", path: "/legacy/", publishedAt: null },
  ];
  const selected = selectWeeklyPosts(posts, "2026-08-15T00:00:00.000Z");
  assert.deepEqual(selected.map((post) => post.title), ["New <post>"]);
  const html = weeklyDigestHtml(selected);
  assert.match(html, /New &lt;post&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /Featured writing/);
  assert.match(html, /Read the essay/);
  assert.match(html, /max-width:640px/);
  assert.match(html, /background:#f6f4ef/);
  assert.match(html, /background:#215643/);
  assert.match(html, /background:#e7ece6/);
});

test("weekly drafts retain posts published while the previous draft awaited review", async () => {
  const previousFetch = global.fetch;
  const previousEnv = Object.fromEntries(["RESEND_API_KEY", "RESEND_SEGMENT_ID", "NEWSLETTER_FROM", "NEWSLETTER_CONFIRMATION_SECRET"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, { RESEND_API_KEY: "test-key", RESEND_SEGMENT_ID: "segment_test", NEWSLETTER_FROM: "Truong <newsletter@truongphan.com>", NEWSLETTER_CONFIRMATION_SECRET: "secret" });
  let draft;
  global.fetch = async (_url, options = {}) => {
    if (!options.method) return new Response(JSON.stringify({ data: [{ status: "sent", subject: "Weekly newsletter — 2026-09-04", created_at: "2026-09-04T02:00:00.000Z", sent_at: "2026-09-04T07:00:00.000Z" }] }), { status: 200 });
    draft = JSON.parse(options.body);
    return new Response(JSON.stringify({ data: { id: "br_test" } }), { status: 200 });
  };
  try {
    const result = await createWeeklyNewsletterDraft([{ title: "Friday post", description: "Published after the draft", path: "/friday/", publishedAt: "2026-09-04T04:00:00.000Z" }], new Date("2026-09-11T02:00:00.000Z"));
    assert.equal(result.created, true);
    assert.match(draft.html, /Friday post/);
  } finally {
    global.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test("weekly drafts do not duplicate scheduled or queued Resend broadcasts", async () => {
  const previousFetch = global.fetch;
  const previousEnv = Object.fromEntries(["RESEND_API_KEY", "RESEND_SEGMENT_ID", "NEWSLETTER_FROM"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, { RESEND_API_KEY: "test-key", RESEND_SEGMENT_ID: "segment_test", NEWSLETTER_FROM: "Truong <newsletter@truongphan.com>" });
  try {
    for (const status of ["scheduled", "queued"]) {
      global.fetch = async () => new Response(JSON.stringify({ data: [{ status, name: "Weekly newsletter — 2026-09-04" }] }), { status: 200 });
      assert.deepEqual(await createWeeklyNewsletterDraft([], new Date("2026-09-11T02:00:00.000Z")), { created: false, reason: "draft-exists" });
    }
  }
  finally { global.fetch = previousFetch; for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test("newsletter studio excludes posts already in sent and active broadcasts", async () => {
  const previousFetch = global.fetch;
  const previousEnv = Object.fromEntries(["RESEND_API_KEY", "RESEND_SEGMENT_ID", "NEWSLETTER_FROM", "NEWSLETTER_PROVIDER"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, { RESEND_API_KEY: "test-key", RESEND_SEGMENT_ID: "segment_test", NEWSLETTER_FROM: "Truong <newsletter@truongphan.com>", NEWSLETTER_PROVIDER: "resend" });
  const posts = [
    { title: "Sent", description: "Sent", path: "/sent/", publishedAt: "2026-09-01T00:00:00.000Z" },
    { title: "Draft", description: "Draft", path: "/draft/", publishedAt: "2026-09-02T00:00:00.000Z" },
    { title: "Queued", description: "Queued", path: "/queued/", publishedAt: "2026-09-03T00:00:00.000Z" },
    { title: "Waiting", description: "Waiting", path: "/waiting/", publishedAt: "2026-09-04T00:00:00.000Z" },
  ];
  const issues = [
    { id: "sent", status: "sent", name: "Sent", html: '<a href="https://truongphan.com/sent/">Sent</a>' },
    { id: "draft", status: "draft", name: "Draft", html: '<a href="https://truongphan.com/draft/">Draft</a>' },
    { id: "queued", status: "queued", name: "Queued", html: '<a href="https://truongphan.com/queued/">Queued</a>' },
  ];
  global.fetch = async (url) => {
    if (url === "https://api.resend.com/broadcasts") return new Response(JSON.stringify({ data: issues.map(({ html, ...issue }) => issue) }), { status: 200 });
    return new Response(JSON.stringify({ data: issues.find((issue) => url.endsWith(`/${issue.id}`)) }), { status: 200 });
  };
  try { assert.deepEqual((await getNewsletterStudio(posts)).queue.map((post) => post.path), ["/waiting/"]); }
  finally { global.fetch = previousFetch; for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test("newsletter studio uses Resend draft names and creation times", async () => {
  const previousFetch = global.fetch;
  const previousEnv = Object.fromEntries(["RESEND_API_KEY", "RESEND_SEGMENT_ID", "NEWSLETTER_FROM"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, { RESEND_API_KEY: "test-key", RESEND_SEGMENT_ID: "segment_test", NEWSLETTER_FROM: "Truong <newsletter@truongphan.com>" });
  global.fetch = async () => new Response(JSON.stringify({ data: [{ id: "draft", name: "Weekly digest", status: "draft", created_at: "2026-09-03T09:00:00.000Z" }] }), { status: 200 });
  try {
    const issue = (await getNewsletterStudio([])).issues[0];
    assert.equal(issue.subject, "Weekly digest");
    assert.equal(issue.createdAt, "2026-09-03T09:00:00.000Z");
  } finally { global.fetch = previousFetch; for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test("manual drafts escape content and send through the configured provider", async () => {
  const previousFetch = global.fetch;
  const previousEnv = Object.fromEntries(["RESEND_API_KEY", "RESEND_SEGMENT_ID", "NEWSLETTER_FROM"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, { RESEND_API_KEY: "test-key", RESEND_SEGMENT_ID: "segment_test", NEWSLETTER_FROM: "Truong <newsletter@truongphan.com>" });
  let body; let sentUrl;
  global.fetch = async (url, options = {}) => {
    if (url.endsWith("/send")) { sentUrl = url; return new Response(JSON.stringify({ data: { id: "br_test", status: "sent" } }), { status: 200 }); }
    body = JSON.parse(options.body); return new Response(JSON.stringify({ data: { id: "br_test", status: "draft" } }), { status: 200 });
  };
  try {
    const result = await createNewsletterDraft([{ title: "<Unsafe>", description: "A & B", path: "/safe/", publishedAt: "2026-09-03T00:00:00.000Z" }], { paths: ["/safe/"], subject: "This week", intro: "<Intro>" });
    assert.equal(result.issue.id, "br_test");
    assert.equal(body.segment_id, "segment_test");
    assert.equal(body.name, "This week");
    assert.match(body.html, /&lt;Unsafe&gt;/);
    assert.match(body.html, /&lt;Intro&gt;/);
    await sendNewsletterDraft("br_test");
    assert.match(sentUrl, /\/broadcasts\/br_test\/send$/);
  } finally { global.fetch = previousFetch; for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test("provider drafts can be deleted", async () => {
  const previousFetch = global.fetch;
  const previousEnv = Object.fromEntries(["RESEND_API_KEY", "RESEND_SEGMENT_ID", "NEWSLETTER_FROM"].map((key) => [key, process.env[key]]));
  Object.assign(process.env, { RESEND_API_KEY: "test-key", RESEND_SEGMENT_ID: "segment_test", NEWSLETTER_FROM: "Truong <newsletter@truongphan.com>" });
  let request;
  global.fetch = async (url, options = {}) => {
    if (!options.method) return new Response(JSON.stringify({ data: [{ id: "br_test", status: "draft" }] }), { status: 200 });
    request = { url, method: options.method }; return new Response(JSON.stringify({}), { status: 200 });
  };
  try {
    assert.deepEqual(await deleteNewsletterDraft("br_test"), { provider: "resend", deleted: "br_test" });
    assert.deepEqual(request, { url: "https://api.resend.com/broadcasts/br_test", method: "DELETE" });
  } finally { global.fetch = previousFetch; for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});
