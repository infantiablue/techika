"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CodeEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markdown";
import { FilerobotEditor } from "./filerobot-editor";
import { Markdown } from "./markdown";
import { readArticleDrafts, removeArticleDraft, saveArticleDraft } from "../lib/article-drafts";
import { coverSize } from "../lib/media-rules";
import { optimizeImage, optimizationSummary } from "../lib/image-optimize";
import { MediaLibrary } from "./media-library";
import statusStyles from "./article-status-select.module.css";

const blankArticle = () => ({ slug: "", title: "", description: "", author: "Truong Phan", date: new Date().toISOString().slice(0, 10), status: "draft", tags: [], image: "", imageAlt: "", featured: false, content: "" });
const slugify = (value) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function request(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

async function coverFile(blob) {
  const source = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error("The generated image could not be previewed.")); image.src = source; });
    const canvas = document.createElement("canvas");
    canvas.width = coverSize.width; canvas.height = coverSize.height;
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const normalized = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("The generated image could not be prepared.")), "image/png"));
    return new File([normalized], "ai-cover.png", { type: "image/png" });
  } finally { URL.revokeObjectURL(source); }
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
  const [direction, setDirection] = useState("");
  const [generatedCover, setGeneratedCover] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [replacement, setReplacement] = useState(null);
  const replaceInput = useRef(null);
  const persisted = Boolean(existingSlug);

  useEffect(() => () => { if (generatedCover) URL.revokeObjectURL(generatedCover.preview); }, [generatedCover]);

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
      if (name === "status" && value === "draft") next.featured = false;
      return next;
    });
  }
  async function run(work, success) {
    setPending(true); setError(""); setMessage("");
    try { const result = await work(); if (result.state) setState(result.state); setMessage(`${typeof success === "function" ? success(result) : success} Commit ${result.commit.slice(0, 7)} is deploying.`); return result; }
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
    await publishImage(file, setAsCover);
  }
  async function publishImage(nextFile, cover) {
    const result = await run(async () => { const optimization = await optimizeImage(nextFile, { cover }); const form = new FormData(); form.set("file", optimization.file); form.set("slug", article.slug); form.set("setCover", String(cover)); form.set("imageAlt", article.imageAlt); return { ...await request("/api/admin/media", { method: "POST", body: form }), optimization }; }, (next) => `Image published. ${optimizationSummary(next.optimization)}`);
    if (result && cover) { setArticle((current) => ({ ...current, image: result.image })); setBaseline((current) => current ? ({ ...current, image: result.image, imageAlt: article.imageAlt }) : current); }
    if (result) setFile(null);
  }
  async function generateCover() {
    if (!article.title || !article.description) { setError("Add a title and description before generating a cover."); return; }
    setGenerating(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/cover-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: article.title, description: article.description, tags: article.tags, direction }) });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || "Image generation failed."); }
      const nextFile = await coverFile(await response.blob());
      setGeneratedCover({ file: nextFile, preview: URL.createObjectURL(nextFile) });
    } catch (reason) { setError(reason.message || "Image generation failed."); }
    finally { setGenerating(false); }
  }
  async function useGeneratedCover() {
    if (!persisted) { setMessage("Save the article before publishing this cover."); return; }
    if (!article.imageAlt) { setError("Add a cover description before using this cover."); return; }
    await publishImage(generatedCover.file, true);
  }
  async function useCover(item) {
    const result = await run(() => request("/api/admin/media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: article.slug, image: item.path, imageAlt: article.imageAlt }) }), "Cover updated.");
    if (result) { setArticle((current) => ({ ...current, image: item.path })); setBaseline((current) => current ? ({ ...current, image: item.path, imageAlt: article.imageAlt }) : current); }
  }
  async function remove(item) { if (window.confirm(`Delete ${item.displayName}? It will disappear after the next deploy.`)) await run(() => request("/api/admin/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: item.path }) }), "Image deleted."); }
  async function copy(item) { await navigator.clipboard.writeText(item.path); setMessage("Image URL copied."); }
  function chooseReplacement(item) { setReplacement(item); replaceInput.current.value = ""; replaceInput.current.click(); }
  async function replace(item, sourceFile, optimizeOnly = false) {
    setPending(true); setError(""); setMessage("");
    try {
      const optimization = await optimizeImage(sourceFile, { cover: item.usages.some((usage) => usage.role === "cover") });
      if (optimizeOnly && !optimization.optimized) return setMessage("This image is already efficient.");
      const uses = item.usages.length ? ` It is used ${item.usages.length} time${item.usages.length === 1 ? "" : "s"}.` : "";
      if (!window.confirm(`Replace ${item.displayName}?${uses} ${optimizationSummary(optimization)}`)) return;
      const form = new FormData(); form.set("image", item.path); form.set("file", optimization.file);
      const result = await request("/api/admin/media", { method: "PUT", body: form });
      setState(result.state);
      if (article.image === item.path) { setArticle((current) => ({ ...current, image: result.image })); setBaseline((current) => current ? ({ ...current, image: result.image }) : current); }
      setMessage(`Image replaced. ${optimizationSummary(optimization)} Commit ${result.commit.slice(0, 7)} is deploying.`);
    } catch (reason) { setError(reason.message || "Unable to replace media."); }
    finally { setPending(false); setReplacement(null); }
  }
  async function replaceSelected(event) { const nextFile = event.target.files?.[0]; if (replacement && nextFile) await replace(replacement, nextFile); }
  async function optimize(item) {
    try {
      const response = await fetch(item.path);
      if (!response.ok) throw new Error("The existing image could not be loaded.");
      const blob = await response.blob();
      await replace(item, new File([blob], item.name, { type: blob.type }), true);
    } catch (reason) { setError(reason.message || "Unable to optimize media."); }
  }
  return <main className="admin-shell"><section className="article-studio">
    <header className="media-studio-header"><div><p className="eyebrow">Publishing studio</p><h1>{localDraft && !persisted ? "Local draft" : persisted ? "Article editor" : "New article"}</h1><p>Write Markdown, set metadata, and manage images without leaving the article.</p></div></header>
    <div className="article-editor-status">{(persisted || localDraft) && <p className="media-muted">Editing src/blog/posts/{article.slug}.md</p>}{draftStatus && <p className="article-draft-status" role="status">{draftStatus}</p>}</div>
    <form className="article-form" onSubmit={save}>
      <section className="article-metadata"><label>Title<input value={article.title} onChange={(event) => change("title", event.target.value)} required /></label><label>Description<input value={article.description} onChange={(event) => change("description", event.target.value)} required /></label><label>Author<input value={article.author} onChange={(event) => change("author", event.target.value)} required /></label><label>Date<input type="date" value={article.date} onChange={(event) => change("date", event.target.value)} required /></label><label>Status<select className={statusStyles.select} value={article.status} onChange={(event) => change("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label><label>URL slug<input value={article.slug} onChange={(event) => { setSlugTouched(true); change("slug", event.target.value); }} disabled={persisted} required /></label><label>Tags<input value={article.tags.join(", ")} onChange={(event) => change("tags", event.target.value.split(",").map((tag) => tag.trim()))} placeholder="career, writing" /></label><label>Cover image URL<input value={article.image} onChange={(event) => change("image", event.target.value)} /></label><label>Cover description<input value={article.imageAlt} onChange={(event) => change("imageAlt", event.target.value)} /></label><label className="media-cover-toggle"><input type="checkbox" checked={article.featured} onChange={(event) => change("featured", event.target.checked)} disabled={article.status !== "published"} /><span><strong>Feature on homepage</strong><small>Requires a published article and cover.</small></span></label></section>
      <section className="article-writing"><label>Markdown<CodeEditor value={article.content} onValueChange={(value) => change("content", value)} highlight={(value) => Prism.highlight(value, Prism.languages.markdown, "markdown")} padding={12} tabSize={2} insertSpaces textareaId="article-markdown" textareaClassName="markdown-source-textarea" preClassName="markdown-source-highlight" className="markdown-source-editor" aria-label="Markdown source" required /></label><div className="article-preview"><p className="eyebrow">Live preview</p>{article.image && <img className="cover" src={article.image} alt={article.imageAlt} />}<h1>{article.title || "Untitled"}</h1><article className="markdown"><Markdown highlightCode={false}>{article.content || "Start writing…"}</Markdown></article></div></section>
      <button className="media-publish-button" disabled={pending}>{pending ? "Saving…" : "Save article"}</button>
    </form>
    {message && <p className="admin-success media-feedback" role="status">{message}</p>}{error && <p className="admin-error media-feedback" role="alert">{error}</p>}
    <section className="media-library article-media"><header><div><p className="eyebrow">Article media</p><h2>Images</h2></div><p>{persisted ? `${state.media.length} published assets` : "Save the article to upload images"}</p></header><section className="ai-cover-panel"><div><p className="eyebrow">AI cover</p><h3>Make a visual starting point</h3><p>Uses the title, description, tags, and your direction. Covers are generated without text.</p></div><label>Visual direction <textarea value={direction} onChange={(event) => setDirection(event.target.value)} maxLength="600" placeholder="Optional: quiet editorial illustration, clear metaphor, forest-green details" /></label><div className="ai-cover-actions"><button type="button" className="media-publish-button" onClick={generateCover} disabled={pending || generating}>{generating ? "Generating…" : generatedCover ? "Regenerate cover" : "Generate cover"}</button>{generatedCover && <button type="button" className="admin-secondary" onClick={useGeneratedCover} disabled={pending || generating}>Use as cover</button>}</div>{generatedCover && <img className="ai-cover-preview" src={generatedCover.preview} alt="Generated cover preview" />}{!persisted && generatedCover && <p className="media-muted">This preview stays in this browser until the article is saved.</p>}</section>{persisted && <><form className="media-upload-panel" onSubmit={upload}><label className="media-file-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile} required /><strong>{file ? file.name : "Choose an image"}</strong><span>JPEG, PNG, WebP, or GIF · cover {coverSize.width} × {coverSize.height} · up to 10 MiB</span></label>{file && <button type="button" className="media-edit-button" onClick={() => setEditorFile(file)}>Edit image</button>}<label className="media-cover-toggle"><input type="checkbox" checked={setAsCover} onChange={(event) => setSetAsCover(event.target.checked)} /><span><strong>Make this the cover</strong><small>Uses the cover description above.</small></span></label><button className="media-publish-button" disabled={pending}>{pending ? "Publishing…" : "Publish image"}</button></form><MediaLibrary items={state.media} articleSlug={article.slug} currentCover={article.image} coverDisabled={!article.imageAlt} pending={pending} onCopy={copy} onDelete={remove} onReplace={chooseReplacement} onOptimize={optimize} onUseCover={useCover} /></>}</section>
    <input ref={replaceInput} className="media-hidden-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={replaceSelected} aria-label={replacement ? `Replacement for ${replacement.displayName}` : "Choose a replacement image"} />
    {editorFile && <FilerobotEditor file={editorFile} cover={setAsCover} onSave={(nextFile) => { setFile(nextFile); setEditorFile(null); setMessage("Image edits are ready to publish."); }} onClose={() => setEditorFile(null)} />}
  </section></main>;
}
