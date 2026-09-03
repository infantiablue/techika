"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  async function subscribe(event) {
    event.preventDefault();
    setPending(true); setStatus("Sending confirmation email…");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/newsletter/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), website: form.get("website") }) });
      const result = await response.json();
      setStatus(response.ok ? "Check your inbox to confirm your subscription." : result.error || "Unable to subscribe right now. Please try again.");
      if (response.ok) event.currentTarget.reset();
    } catch { setStatus("Unable to subscribe right now. Please try again."); }
    finally { setPending(false); }
  }
  return <section className="newsletter-signup" aria-labelledby="newsletter-title"><div><p className="eyebrow">Newsletter</p><h2 id="newsletter-title">Get new writing by email</h2><p>One weekly digest. Unsubscribe whenever you want.</p></div><form onSubmit={subscribe}><label>Email address<input type="email" name="email" autoComplete="email" required /></label><input className="newsletter-trap" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" /><button type="submit" disabled={pending}>Subscribe</button></form>{status && <p role="status">{status}</p>}</section>;
}
