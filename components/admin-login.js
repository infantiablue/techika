"use client";

import { useState } from "react";
import styles from "./admin-login.module.css";

export function AdminLogin() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const password = new FormData(event.currentTarget).get("password");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign("/admin/articles/");
    } catch (reason) {
      setError(reason.message || "Unable to sign in.");
      setPending(false);
    }
  }

  return <main className={styles.shell}><section className={styles.stage} aria-label="Admin sign in"><div className={styles.intro}><p className={styles.eyebrow}>Techika / Publishing desk</p><div className={styles.mark} aria-hidden="true">TP</div><h1>Return to the writing desk.</h1><p className={styles.context}>Manage the articles and media behind your public site from one private workspace.</p><p className={styles.note}>Git-backed Markdown · Private access</p></div><form className={styles.card} onSubmit={submit}><header><p className={styles.eyebrow}>Secure access</p><h2>Sign in</h2><p>Enter your admin password to continue.</p></header><label className={styles.field}>Password<input name="password" type="password" autoComplete="current-password" aria-invalid={Boolean(error)} aria-describedby={error ? "admin-login-error" : undefined} required autoFocus /></label>{error && <p className={styles.error} id="admin-login-error" role="alert">{error}</p>}<button className={styles.submit} disabled={pending}>{pending ? "Signing in…" : "Open publishing desk"}</button></form></section></main>;
}
