"use client";

import { useMemo, useState } from "react";
import { composeNewsletterHtml } from "../lib/newsletter-composer.js";

const defaultIntro = "Here is this week's writing.";
const queueLimits = [10, 20, 50];
function issueTime(value) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : `${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`; }

export function NewsletterStudio({ initialState }) {
  const [state, setState] = useState(initialState);
  const [paths, setPaths] = useState([]);
  const [subject, setSubject] = useState(`Weekly newsletter — ${new Date().toISOString().slice(0, 10)}`);
  const [intro, setIntro] = useState(defaultIntro);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [queueLimit, setQueueLimit] = useState(10);
  const selected = useMemo(() => state.queue.filter((post) => paths.includes(post.path)), [state.queue, paths]);
  const html = useMemo(() => composeNewsletterHtml(selected, intro), [selected, intro]);
  const visibleQueue = state.queue.slice(0, queueLimit);
  const visiblePaths = visibleQueue.map((post) => post.path);
  const allSelected = visibleQueue.length > 0 && visibleQueue.every((post) => paths.includes(post.path));

  function toggle(path) { setPaths((current) => current.includes(path) ? current.filter((value) => value !== path) : [...current, path]); }
  function toggleAll() { setPaths((current) => allSelected ? current.filter((path) => !visiblePaths.includes(path)) : [...new Set([...current, ...visiblePaths])]); }
  async function request(body) {
    const response = await fetch("/api/admin/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Newsletter action failed.");
    return data;
  }
  async function refresh() {
    const response = await fetch("/api/admin/newsletter");
    if (!response.ok) throw new Error("Unable to refresh newsletters.");
    const next = await response.json(); setState(next); setPaths([]);
  }
  async function create() {
    setBusy(true); setStatus("");
    try { const result = await request({ action: "create", paths, subject, intro }); setStatus(`Draft ${result.issue.id || "created"} in ${result.provider}.`); await refresh(); }
    catch (error) { setStatus(error.message); } finally { setBusy(false); }
  }
  async function send(issue) {
    if (!window.confirm(`Send “${issue.subject}” through ${state.provider} to its configured audience now?`)) return;
    setBusy(true); setStatus("");
    try { await request({ action: "send", id: issue.id }); setStatus(`Sent ${issue.subject}.`); await refresh(); }
    catch (error) { setStatus(error.message); } finally { setBusy(false); }
  }
  async function remove(issue) {
    if (!window.confirm(`Delete provider draft “${issue.subject}”? This cannot be undone.`)) return;
    setBusy(true); setStatus("");
    try { await request({ action: "delete", id: issue.id }); setStatus(`Deleted ${issue.subject}.`); await refresh(); }
    catch (error) { setStatus(error.message); } finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(html); setStatus("Portable HTML copied."); } catch { setStatus("Copy failed. Select the HTML below instead."); } }
  function download() { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([html], { type: "text/html" })); link.download = "newsletter.html"; link.click(); URL.revokeObjectURL(link.href); }
  const drafts = state.issues.filter((issue) => issue.status === "draft");
  const sent = state.issues.filter((issue) => issue.status === "sent");

  return <main className="admin-shell"><section className="newsletter-studio">
    <header className="media-studio-header"><div><p className="eyebrow">Newsletter studio</p><h1>Weekly digest</h1><p>Provider: <strong>{state.provider}</strong>. Subscribers and delivery stay with the provider.</p></div></header>
    <div className="newsletter-workspace"><section className="newsletter-compose"><label>Subject<input value={subject} maxLength="200" onChange={(event) => setSubject(event.target.value)} /></label><label>Intro<textarea value={intro} maxLength="2000" onChange={(event) => setIntro(event.target.value)} /></label><fieldset><legend>Weekly queue</legend>{state.queue.length ? <><div className="newsletter-queue-tools"><button className="admin-secondary newsletter-select-all" type="button" onClick={toggleAll}>{allSelected ? "Deselect all" : "Select all"}</button><label>Show recent articles<select value={queueLimit} onChange={(event) => setQueueLimit(Number(event.target.value))}>{queueLimits.map((limit) => <option key={limit} value={limit}>{limit}</option>)}</select></label></div>{visibleQueue.map((post) => <label className="newsletter-post" key={post.path}><input type="checkbox" checked={paths.includes(post.path)} onChange={() => toggle(post.path)} /><span><strong>{post.title}</strong><small>{post.description}</small></span></label>)}</> : <p className="media-muted">No published posts are waiting for a digest.</p>}</fieldset><div className="newsletter-actions"><button disabled={busy || !selected.length} onClick={create}>Generate provider draft</button><button className="admin-secondary" type="button" onClick={copy}>Copy HTML</button><button className="admin-secondary" type="button" onClick={download}>Download HTML</button></div>{status && <p className={status.startsWith("Draft") || status.startsWith("Sent") || status.startsWith("Portable") ? "admin-success" : "admin-error"} role="status">{status}</p>}</section>
    <section className="newsletter-preview"><p className="eyebrow">Portable HTML preview</p><iframe title="Newsletter HTML preview" sandbox="" srcDoc={html} /><textarea aria-label="Portable newsletter HTML" readOnly value={html} /></section></div>
    <section className="newsletter-history"><div><h2>Provider drafts</h2>{drafts.length ? <ul>{drafts.map((issue) => <li key={issue.id}><span><strong>{issue.subject}</strong><small>{issue.status} · Created {issueTime(issue.createdAt) || "unknown"}</small></span><div className="newsletter-draft-actions"><button disabled={busy} onClick={() => send(issue)}>Send to audience</button><button className="admin-danger" disabled={busy} onClick={() => remove(issue)}>Delete</button></div></li>)}</ul> : <p className="media-muted">No active provider drafts.</p>}</div><div><h2>Sent history</h2>{sent.length ? <ul>{sent.map((issue) => <li key={issue.id}><span><strong>{issue.subject}</strong><small>Created {issueTime(issue.createdAt) || "unknown"}{issue.sentAt ? ` · Sent ${issueTime(issue.sentAt)}` : ""}</small></span></li>)}</ul> : <p className="media-muted">No sent newsletters from {state.provider}.</p>}</div></section>
  </section></main>;
}
