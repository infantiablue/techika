import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "./posts.js";
import { composeNewsletterHtml } from "./newsletter-composer.js";
import { getNewsletterProvider } from "./newsletter-provider.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digestPrefix = "Weekly newsletter — ";

function confirmationConfig() {
  const { NEWSLETTER_CONFIRMATION_SECRET } = process.env;
  if (!NEWSLETTER_CONFIRMATION_SECRET) throw new Error("Newsletter is not configured.");
  return { secret: NEWSLETTER_CONFIRMATION_SECRET };
}

function signature(value, secret) { return createHmac("sha256", secret).update(value).digest("base64url"); }

export function validateNewsletterEmail(email) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!emailPattern.test(normalized) || normalized.length > 320) throw new Error("Enter a valid email address.");
  return normalized;
}

export function createConfirmationToken(email, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ email: validateNewsletterEmail(email), exp: now + 24 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function readConfirmationToken(token, secret, now = Date.now()) {
  const [payload, received] = typeof token === "string" ? token.split(".") : [];
  if (!payload || !received) throw new Error("This confirmation link is invalid or expired.");
  const expected = signature(payload, secret);
  if (received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) throw new Error("This confirmation link is invalid or expired.");
  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { throw new Error("This confirmation link is invalid or expired."); }
  if (!Number.isFinite(data.exp) || data.exp < now) throw new Error("This confirmation link is invalid or expired.");
  return validateNewsletterEmail(data.email);
}

export async function requestNewsletterSubscription(email) {
  const settings = confirmationConfig();
  const token = createConfirmationToken(email, settings.secret);
  const confirmationUrl = `${siteUrl}/newsletter/confirm/?token=${encodeURIComponent(token)}`;
  const { RESEND_API_KEY, NEWSLETTER_FROM } = process.env;
  if (!RESEND_API_KEY || !NEWSLETTER_FROM) throw new Error("Newsletter is not configured.");
  await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: NEWSLETTER_FROM, to: [validateNewsletterEmail(email)], subject: "Confirm your subscription", html: `<p>Confirm your subscription to new writing from Truong Phan.</p><p><a href="${confirmationUrl}">Confirm subscription</a></p><p>This link expires in 24 hours.</p>` }) }).then(async (response) => { if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Resend request failed."); });
}

export async function confirmNewsletterSubscription(token) {
  const settings = confirmationConfig();
  const email = readConfirmationToken(token, settings.secret);
  const { RESEND_API_KEY, RESEND_SEGMENT_ID } = process.env;
  if (!RESEND_API_KEY || !RESEND_SEGMENT_ID) throw new Error("Newsletter is not configured.");
  const response = await fetch("https://api.resend.com/contacts", { method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: RESEND_SEGMENT_ID }] }) });
  if (response.ok) return;
  if (response.status !== 409) { const error = new Error((await response.json().catch(() => ({}))).message || "Resend request failed."); error.status = response.status; throw error; }
  const membership = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(RESEND_SEGMENT_ID)}`, { method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" } });
  if (!membership.ok && membership.status !== 409) { const error = new Error((await membership.json().catch(() => ({}))).message || "Resend request failed."); error.status = membership.status; throw error; }
}

export function selectWeeklyPosts(posts, since) {
  const cutoff = since ? Date.parse(since) : 0;
  return posts.filter((post) => post.publishedAt && Date.parse(post.publishedAt) > cutoff).sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
}

export function weeklyDigestHtml(posts) {
  return composeNewsletterHtml(posts);
}

function issuePaths(issue, posts) {
  const html = issue.html || issue.body || "";
  return posts.filter((post) => html.includes(`${siteUrl}${post.path}`)).map((post) => post.path);
}

function normalizeIssue(issue, posts) {
  return { id: issue.id, subject: issue.subject || issue.name || "Untitled draft", status: issue.status || "draft", createdAt: issue.created_at || null, sentAt: issue.sent_at || null, includedPaths: issuePaths(issue, posts) };
}

export async function getNewsletterStudio(posts) {
  const provider = getNewsletterProvider();
  const issues = await Promise.all((await provider.listIssues()).map(async (issue) => normalizeIssue({ ...issue, ...await provider.getIssue(issue.id) }, posts)));
  const included = new Set(issues.filter((issue) => issue.status === "sent" || issue.status === "draft" || issue.status === "scheduled" || issue.status === "queued").flatMap((issue) => issue.includedPaths));
  return { provider: provider.name, issues, queue: posts.filter((post) => !included.has(post.path)) };
}

function selectedPosts(posts, paths) {
  if (!Array.isArray(paths)) throw new Error("Choose at least one published post.");
  const selected = paths.map((path) => posts.find((post) => post.path === path)).filter(Boolean);
  if (!selected.length || selected.length !== new Set(paths).size) throw new Error("Choose at least one published post.");
  return selected;
}

export async function createNewsletterDraft(posts, { paths, subject, intro }) {
  const selected = selectedPosts(posts, paths);
  const cleanSubject = typeof subject === "string" ? subject.trim() : "";
  if (!cleanSubject || cleanSubject.length > 200) throw new Error("Enter a subject under 200 characters.");
  const cleanIntro = typeof intro === "string" ? intro.trim() : "";
  if (!cleanIntro || cleanIntro.length > 2000) throw new Error("Enter an intro under 2,000 characters.");
  const html = composeNewsletterHtml(selected, cleanIntro);
  const provider = getNewsletterProvider();
  const issue = await provider.createDraft({ subject: cleanSubject, html });
  return { provider: provider.name, issue: { id: issue?.id, subject: cleanSubject, status: issue?.status || "draft", includedPaths: selected.map((post) => post.path) }, html };
}

export async function sendNewsletterDraft(id) {
  if (typeof id !== "string" || !id) throw new Error("Select a provider draft to send.");
  const provider = getNewsletterProvider();
  return { provider: provider.name, issue: await provider.sendDraft(id) };
}

export async function deleteNewsletterDraft(id) {
  if (typeof id !== "string" || !id) throw new Error("Select a provider draft to delete.");
  const provider = getNewsletterProvider();
  const issue = (await provider.listIssues()).find((candidate) => candidate.id === id);
  if (!issue || issue.status !== "draft") throw new Error("Only provider drafts can be deleted.");
  await provider.deleteDraft(id);
  return { provider: provider.name, deleted: id };
}

export async function createWeeklyNewsletterDraft(posts, now = new Date()) {
  const provider = getNewsletterProvider();
  const broadcasts = await provider.listIssues();
  const weekly = (broadcast) => (broadcast.subject || broadcast.name || "").startsWith(digestPrefix);
  if (broadcasts.some((broadcast) => (broadcast.status === "draft" || broadcast.status === "scheduled" || broadcast.status === "queued") && weekly(broadcast))) return { created: false, reason: "draft-exists" };
  const sent = broadcasts.filter((broadcast) => broadcast.status === "sent" && weekly(broadcast)).sort((a, b) => Date.parse(b.sent_at || b.created_at) - Date.parse(a.sent_at || a.created_at))[0];
  const selected = selectWeeklyPosts(posts, sent?.created_at);
  if (!selected.length) return { created: false, reason: "no-posts" };
  const subject = `${digestPrefix}${now.toISOString().slice(0, 10)}`;
  const broadcast = await provider.createDraft({ subject, html: weeklyDigestHtml(selected) });
  return { created: true, broadcast, posts: selected };
}
