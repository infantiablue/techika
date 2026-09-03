function resendConfig() {
  const { RESEND_API_KEY, RESEND_SEGMENT_ID, NEWSLETTER_FROM } = process.env;
  if (!RESEND_API_KEY || !RESEND_SEGMENT_ID || !NEWSLETTER_FROM) throw new Error("Newsletter is not configured.");
  return { apiKey: RESEND_API_KEY, segmentId: RESEND_SEGMENT_ID, from: NEWSLETTER_FROM };
}

async function resend(path, options = {}, apiKey) {
  const response = await fetch(`https://api.resend.com${path}`, { ...options, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "Resend request failed.");
    error.status = response.status;
    throw error;
  }
  return body;
}

function resendProvider() {
  const settings = resendConfig();
  return {
    name: "resend",
    async listIssues() { return (await resend("/broadcasts", {}, settings.apiKey)).data || []; },
    async getIssue(id) { return (await resend(`/broadcasts/${encodeURIComponent(id)}`, {}, settings.apiKey)).data; },
    async createDraft({ subject, html }) { return (await resend("/broadcasts", { method: "POST", body: JSON.stringify({ segment_id: settings.segmentId, from: settings.from, name: subject, subject, html }) }, settings.apiKey)).data; },
    async sendDraft(id) { return (await resend(`/broadcasts/${encodeURIComponent(id)}/send`, { method: "POST" }, settings.apiKey)).data; },
    async deleteDraft(id) { return resend(`/broadcasts/${encodeURIComponent(id)}`, { method: "DELETE" }, settings.apiKey); },
  };
}

export function getNewsletterProvider() {
  const provider = (process.env.NEWSLETTER_PROVIDER || "resend").toLowerCase();
  if (provider === "resend") return resendProvider();
  throw new Error(`Unsupported newsletter provider: ${provider}.`);
}
