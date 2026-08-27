"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CodeEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markdown";
import { FilerobotEditor } from "./filerobot-editor";
import { Markdown } from "./markdown";
import { readArticleDrafts, removeArticleDraft, saveArticleDraft } from "../lib/article-drafts";
import { coverSize } from "../lib/media-rules";

const blankArticle = () => ({ slug: "", title: "", description: "", author: "Truong Phan", date: new Date().toISOString().slice(0, 10), tags: [], image: "", imageAlt: "", content: "" });
const slugify = (value) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function request(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

export function AdminArticles({ initialState, initialArticle = null, draftKey }) {
  const router = useRouter();
  const localDraft = Boolean(initialArticle?.localDraft);
  const [state, setState] = useState(initialState);
  const [article, setArticle] = useState(initialArticle || blankArticle());
  const [baseline, setBaseline] = useState(initialArticle);
  const [existingSlug, setExistingSlug] = useState(localDraft ? "" : initialArticle?.slug || "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialArticle));
  const [file, setFile] = useState(null);
  const [editorFile, setEditorFile] = useState(null);
  const [setAsCover, setSetAsCover] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const persisted = Boolean(existingSlug);

  useEffect(() => {
    const saved = readArticleDrafts(window.localStorage)[draftKey];
    if (saved?.article) { setArticle(saved.article); setDraftStatus("Draft restored from this browser."); }
    setDraftReady(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady) return;
    const changed = baseline ? JSON.stringify(article) !== JSON.stringify(baseline) : Boolean(article.title || article.description || article.content || article.image || article.tags.length);
    const timer = window.setTimeout(() => {
      try {
        if (changed) { saveArticleDraft(window.localStorage, draftKey, { article, baseSlug: baseline?.slug || "", updatedAt: new Date().toISOString() }); setDraftStatus("Draft saved in this browser."); }
        else { removeArticleDraft(window.localStorage, draftKey); setDraftStatus(""); }
      } catch { setDraftStatus("This browser could not save the draft."); }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [article, baseline, draftKey, draftReady]);

  function change(name, value) {
    setArticle((current) => {
      const next = { ...current, [name]: value };
      if (name === "title" && !slugTouched) next.slug = slugify(value);
      return next;
    });
  }
  async function run(work, success) {
    setPending(true); setError(""); setMessage("");
    try { const result = await work(); if (result.state) setState(result.state); setMessage(`${success} Commit ${result.commit.slice(0, 7)} is deploying.`); return result; }
    catch (reason) { setError(reason.message || "Unable to publish."); return null; }
    finally { setPending(false); }
  }
  async function save(event) {
    event.preventDefault();
    const result = await run(() => request("/api/admin/articles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...article, existingSlug, tags: article.tags }) }), "Article saved.");
    if (result) { const wasNew = !existingSlug; try { removeArticleDraft(window.localStorage, draftKey); } catch {} setArticle(result.article); setBaseline(result.article); setExistingSlug(result.article.slug); setSlugTouched(true); setDraftStatus(""); if (wasNew) router.replace(`/admin/edit/${result.article.slug}/`); }
  }
  function chooseFile(event) { const next = event.target.files?.[0]; if (next) { setFile(next); setEditorFile(next); } }
  async function upload(event) {
    event.preventDefault();
    if (!file || !article) return;
    const result = await run(async () => { const form = new FormData(); form.set("file", file); form.set("slug", article.slug); form.set("setCover", String(setAsCover)); form.set("imageAlt", article.imageAlt); return request("/api/admin/media", { method: "POST", body: form }); }, "Image published.");
    if (result && setAsCover) { setArticle((current) => ({ ...current, image: result.image })); setBaseline((current) => current ? ({ ...current, image: result.image, imageAlt: article.imageAlt }) : current); }
    if (result) setFile(null);
  }
  async function useCover(image) {
    const result = await run(() => request("/api/admin/media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: article.slug, image, imageAlt: article.imageAlt }) }), "Cover updated.");
    if (result) { setArticle((current) => ({ ...current, image })); setBaseline((current) => current ? ({ ...current, image, imageAlt: article.imageAlt }) : current); }
  }
  async function remove(image) { if (window.confirm(`Delete ${image}? This cannot be undone.`)) await run(() => request("/api/admin/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) }), "Image deleted."); }
  async function copy(image) { await navigator.clipboard.writeText(image); setMessage("Image URL copied."); }
  async function logout() { await request("/api/admin/session", { method: "DELETE" }); window.location.assign("/admin/"); }

  return <main className="admin-shell"><section className="article-studio">
    <header className="media-studio-header"><div><p className="eyebrow">Publishing studio</p><h1>{localDraft && !persisted ? "Local draft" : persisted ? "Article editor" : "New article"}</h1><p>Write Markdown, set metadata, and manage images without leaving the article.</p></div><div className="media-header-actions"><Link className="admin-secondary" href="/admin/articles/">All articles</Link><button className="admin-secondary" onClick={logout}>Sign out</button></div></header>
    <div className="article-editor-status">{(persisted || localDraft) && <p className="media-muted">Editing src/blog/posts/{article.slug}.md</p>}{draftStatus && <p className="article-draft-status" role="status">{draftStatus}</p>}</div>
    <form className="article-form" onSubmit={save}>
      <section className="article-metadata"><label>Title<input value={article.title} onChange={(event) => change("title", event.target.value)} required /></label><label>Description<input value={article.description} onChange={(event) => change("description", event.target.value)} required /></label><label>Author<input value={article.author} onChange={(event) => change("author", event.target.value)} required /></label><label>Date<input type="date" value={article.date} onChange={(event) => change("date", event.target.value)} required /></label><label>URL slug<input value={article.slug} onChange={(event) => { setSlugTouched(true); change("slug", event.target.value); }} disabled={persisted} required /></label><label>Tags<input value={article.tags.join(", ")} onChange={(event) => change("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} placeholder="career, writing" /></label><label>Cover image URL<input value={article.image} onChange={(event) => change("image", event.target.value)} /></label><label>Cover description<input value={article.imageAlt} onChange={(event) => change("imageAlt", event.target.value)} /></label></section>
      <section className="article-writing"><label>Markdown<CodeEditor value={article.content} onValueChange={(value) => change("content", value)} highlight={(value) => Prism.highlight(value, Prism.languages.markdown, "markdown")} padding={12} tabSize={2} insertSpaces textareaId="article-markdown" textareaClassName="markdown-source-textarea" preClassName="markdown-source-highlight" className="markdown-source-editor" aria-label="Markdown source" required /></label><div className="article-preview"><p className="eyebrow">Live preview</p>{article.image && <img className="cover" src={article.image} alt={article.imageAlt} />}<h1>{article.title || "Untitled"}</h1><article className="markdown"><Markdown>{article.content || "Start writing…"}</Markdown></article></div></section>
      <button className="media-publish-button" disabled={pending}>{pending ? "Saving…" : "Save article"}</button>
    </form>
    {message && <p className="admin-success media-feedback" role="status">{message}</p>}{error && <p className="admin-error media-feedback" role="alert">{error}</p>}
    <section className="media-library article-media"><header><div><p className="eyebrow">Article media</p><h2>Images</h2></div><p>{persisted ? `${state.media.length} published assets` : "Save the article to upload images"}</p></header>{persisted && <><form className="media-upload-panel" onSubmit={upload}><label className="media-file-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile} required /><strong>{file ? file.name : "Choose an image"}</strong><span>JPEG, PNG, WebP, or GIF · cover {coverSize.width} × {coverSize.height} · up to 10 MiB</span></label>{file && <button type="button" className="media-edit-button" onClick={() => setEditorFile(file)}>Edit image</button>}<label className="media-cover-toggle"><input type="checkbox" checked={setAsCover} onChange={(event) => setSetAsCover(event.target.checked)} /><span><strong>Make this the cover</strong><small>Uses the cover description above.</small></span></label><button className="media-publish-button" disabled={pending}>{pending ? "Publishing…" : "Publish image"}</button></form><div className="media-grid">{state.media.map((item) => <article className="media-card" key={item.path}><div className="media-thumbnail"><img src={item.path} alt="" />{article.image === item.path && <span>Current cover</span>}</div><div className="media-card-body"><p title={item.path}>{item.name}</p><small>{Math.ceil(item.size / 1024)} KB</small></div><div className="media-card-actions"><button type="button" className="admin-secondary" onClick={() => copy(item.path)}>Copy URL</button><button type="button" className="admin-secondary" onClick={() => useCover(item.path)} disabled={pending || !article.imageAlt}>Use as cover</button><button type="button" className="admin-danger" onClick={() => remove(item.path)} disabled={pending}>Delete</button></div></article>)}</div></>}</section>
    {editorFile && <FilerobotEditor file={editorFile} cover={setAsCover} onSave={(nextFile) => { setFile(nextFile); setEditorFile(null); setMessage("Image edits are ready to publish."); }} onClose={() => setEditorFile(null)} />}
  </section></main>;
}
