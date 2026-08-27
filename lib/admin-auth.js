import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const sessionName = "techika_admin";
const sessionMaxAge = 60 * 60 * 8;

function digest(value) { return createHash("sha256").update(value).digest(); }
function sign(value, secret) { return createHmac("sha256", secret).update(value).digest("base64url"); }

export function verifyPassword(password, expected) {
  return typeof password === "string" && typeof expected === "string" && timingSafeEqual(digest(password), digest(expected));
}

export function createSession(secret, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + sessionMaxAge;
  return `${expiresAt}.${sign(String(expiresAt), secret)}`;
}

export function verifySession(value, secret, now = Date.now()) {
  if (typeof value !== "string" || !secret) return false;
  const [expiresAt, signature, ...rest] = value.split(".");
  if (rest.length || !/^\d+$/.test(expiresAt) || !signature) return false;
  const expected = sign(expiresAt, secret);
  return Number(expiresAt) > Math.floor(now / 1000) && timingSafeEqual(digest(signature), digest(expected));
}

export const adminSession = { name: sessionName, maxAge: sessionMaxAge };
