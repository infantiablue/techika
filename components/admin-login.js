"use client";

import { useState } from "react";

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

  return <main className="admin-shell"><form className="admin-card" onSubmit={submit}><h1>Admin</h1><p>Sign in to manage article images.</p><label>Password<input name="password" type="password" autoComplete="current-password" required autoFocus /></label>{error && <p className="admin-error" role="alert">{error}</p>}<button disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button></form></main>;
}
