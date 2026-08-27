"use client";

export function AdminSignOut() {
  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.assign("/admin/");
  }

  return <button className="admin-secondary" type="button" onClick={signOut}>Sign out</button>;
}
