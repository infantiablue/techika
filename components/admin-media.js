"use client";

import { useMemo, useState } from "react";
import { FilerobotEditor } from "./filerobot-editor";

async function request(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

export function AdminMedia({ initialState }) {
  const [state, setState] = useState(initialState);
  const [slug, setSlug] = useState(initialState.articles[0]?.slug || "");
  const [alt, setAlt] = useState(initialState.articles[0]?.imageAlt || "");
  const [setAsCover, setSetAsCover] = useState(true);
  const [file, setFile] = useState(null);
  const [editorFile, setEditorFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const article = useMemo(() => state.articles.find((item) => item.slug === slug), [state.articles, slug]);

  function selectArticle(nextSlug) {
    const next = state.articles.find((item) => item.slug === nextSlug);
    setSlug(nextSlug);
    setAlt(next?.imageAlt || "");
  }

  function chooseFile(event) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setError("");
    setFile(nextFile);
    setEditorFile(nextFile);
  }

  async function run(work, success) {
    setPending(true); setError(""); setMessage("");
    try {
      const result = await work();
      if (result.state) setState(result.state);
      setMessage(`${success} Commit ${result.commit.slice(0, 7)} is deploying.`);
    } catch (reason) {
      setError(reason.message || "Unable to publish media.");
    } finally { setPending(false); }
  }

  async function upload(event) {
    event.preventDefault();
    if (!file) return setError("Choose an image first.");
    await run(async () => {
      const form = new FormData();
      form.set("file", file);
      form.set("slug", slug);
      form.set("setCover", String(setAsCover));
      form.set("imageAlt", alt);
      return request("/api/admin/media", { method: "POST", body: form });
    }, "Image published.");
    setFile(null); event.currentTarget.reset();
  }

  async function chooseCover(imagePath) { await run(() => request("/api/admin/media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, image: imagePath, imageAlt: alt }) }), "Cover updated."); }
  async function remove(imagePath) { if (window.confirm(`Delete ${imagePath}? This cannot be undone.`)) await run(() => request("/api/admin/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: imagePath }) }), "Image deleted."); }
  async function copy(imagePath) { await navigator.clipboard.writeText(imagePath); setMessage("Image URL copied."); }
  async function logout() { await request("/api/admin/session", { method: "DELETE" }); window.location.assign("/admin/"); }

  return <main className="admin-shell"><section className="media-studio">
    <header className="media-studio-header"><div><p className="eyebrow">Publishing studio</p><h1>Article media</h1><p>Prepare a visual, then publish it with the article context intact.</p></div><div className="media-header-actions"><span className="media-status">Git-backed</span><button className="admin-secondary" onClick={logout}>Sign out</button></div></header>
    <div className="media-workspace">
      <aside className="media-article-panel"><div className="media-panel-heading"><span>01</span><div><p className="eyebrow">Article</p><h2>Set the context</h2></div></div><label>Working on<select value={slug} onChange={(event) => selectArticle(event.target.value)}>{state.articles.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label>{article && <><div className="media-cover-frame">{article.image ? <img src={article.image} alt={article.imageAlt} /> : <div className="media-empty-cover">No cover yet</div>}</div><p className="media-article-title">{article.title}</p><p className="media-muted">The current cover stays visible while you prepare a replacement.</p><label>Cover description<input value={alt} onChange={(event) => setAlt(event.target.value)} maxLength="160" required /></label><p className="media-help">Used as the accessible alt text when this image becomes the cover.</p></>}</aside>
      <form className="media-upload-panel" onSubmit={upload}><div className="media-panel-heading"><span>02</span><div><p className="eyebrow">New asset</p><h2>Prepare the image</h2></div></div><label className="media-file-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile} required /><strong>{file ? file.name : "Choose an image"}</strong><span>{file ? "Use the full editor, then publish when ready." : "JPEG, PNG, WebP, or GIF · up to 10 MiB"}</span></label>{file && <button type="button" className="media-edit-button" onClick={() => setEditorFile(file)}>Edit image</button>}<label className="media-cover-toggle"><input type="checkbox" checked={setAsCover} onChange={(event) => setSetAsCover(event.target.checked)} /><span><strong>Make this the cover</strong><small>Updates the article’s frontmatter in the same commit.</small></span></label><button className="media-publish-button" disabled={pending}>{pending ? "Publishing…" : "Publish image"}</button></form>
    </div>
    {message && <p className="admin-success media-feedback" role="status">{message}</p>}{error && <p className="admin-error media-feedback" role="alert">{error}</p>}
    <section className="media-library"><header><div><p className="eyebrow">03 · Library</p><h2>Use an existing image</h2></div><p>{state.media.length} published assets</p></header><div className="media-grid">{state.media.map((item) => <article className="media-card" key={item.path}><div className="media-thumbnail"><img src={item.path} alt="" />{article?.image === item.path && <span>Current cover</span>}</div><div className="media-card-body"><p title={item.path}>{item.name}</p><small>{Math.ceil(item.size / 1024)} KB</small></div><div className="media-card-actions"><button className="admin-secondary" onClick={() => copy(item.path)}>Copy URL</button><button className="admin-secondary" disabled={pending || !slug || !alt} onClick={() => chooseCover(item.path)}>Use as cover</button><button className="admin-danger" disabled={pending} onClick={() => remove(item.path)}>Delete</button></div></article>)}</div></section>
  {editorFile && <FilerobotEditor file={editorFile} onSave={(nextFile) => { setFile(nextFile); setEditorFile(null); setMessage("Image edits are ready to publish."); }} onClose={() => setEditorFile(null)} />}</section></main>;
}
