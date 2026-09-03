import { confirmNewsletterSubscription } from "../../../lib/newsletter";

export async function GET(request) {
  try {
    await confirmNewsletterSubscription(new URL(request.url).searchParams.get("token"));
    return new Response("<!doctype html><title>Subscription confirmed</title><p>Your subscription is confirmed. You can close this tab.</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    return new Response(`<!doctype html><title>Confirmation unavailable</title><p>${error.message || "This confirmation link is invalid or expired."}</p>`, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}
