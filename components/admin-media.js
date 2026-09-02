"use client";

import { useRef, useState } from "react";
import { FilerobotEditor } from "./filerobot-editor";
import { MediaLibrary } from "./media-library";
import { optimizeImage, optimizationSummary } from "../lib/image-optimize";

async function request(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

export function AdminMedia({ initialState }) {
  const [state, setState] = useState(initialState);
  const [file, setFile] = useState(null);
  const [editorFile, setEditorFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [replacement, setReplacement] = useState(null);
  const replaceInput = useRef(null);
  const usedAssets = state.media.filter((item) => item.usages.length > 0).length;
  const sharedAssets = state.media.filter((item) => item.status === "shared").length;
  const unusedAssets = state.media.length - usedAssets;

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
      setMessage(`${typeof success === "function" ? success(result) : success} Commit ${result.commit.slice(0, 7)} is deploying.`);
      return result;
    } catch (reason) {
      setError(reason.message || "Unable to publish media.");
    } finally { setPending(false); }
  }

  async function upload(event) {
    event.preventDefault();
    if (!file) return setError("Choose an image first.");
    const result = await run(async () => {
      const optimization = await optimizeImage(file);
      const form = new FormData();
      form.set("file", optimization.file);
      return { ...await request("/api/admin/media", { method: "POST", body: form }), optimization };
    }, (next) => `Image published. ${optimizationSummary(next.optimization)}`);
    if (result) { setFile(null); event.currentTarget.reset(); }
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
      setState(result.state); setMessage(`Image replaced. ${optimizationSummary(optimization)} Commit ${result.commit.slice(0, 7)} is deploying.`);
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
  return <main className="admin-shell"><section className="media-studio media-library-page">
    <header className="media-library-hero"><div><p className="eyebrow">Publishing studio · assets</p><h1>Media library</h1><p>One place for the images that support your writing. Find what is in use, tidy what is not, and keep every article visually consistent.</p></div><dl aria-label="Media library summary"><div><dt>Assets</dt><dd>{state.media.length}</dd></div><div><dt>In use</dt><dd>{usedAssets}</dd></div><div><dt>Shared</dt><dd>{sharedAssets}</dd></div><div><dt>Unused</dt><dd>{unusedAssets}</dd></div></dl></header>
    <section className="media-library-workspace">
      <form className="media-upload-panel standalone-media-upload media-upload-card" onSubmit={upload}><div className="media-panel-heading"><span>+</span><div><p className="eyebrow">Add to library</p><h2>Publish an image</h2></div></div><label className="media-file-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile} required /><strong>{file ? file.name : "Choose an image"}</strong><span>{file ? "Open the editor to crop or refine it first." : "JPEG, PNG, WebP, or GIF · up to 10 MiB"}</span></label>{file && <button type="button" className="media-edit-button" onClick={() => setEditorFile(file)}>Edit before publishing</button>}<p className="media-help">New files enter the shared library. You can assign them to an article later.</p><button className="media-publish-button" disabled={pending}>{pending ? "Publishing…" : "Publish to library"}</button></form>
      <aside className="media-library-guide"><p className="eyebrow">A small system</p><h2>Keep the library useful.</h2><ol><li><span>01</span>Search by image or article.</li><li><span>02</span>Replace references safely when an image changes.</li><li><span>03</span>Delete only assets marked safe to delete.</li></ol></aside>
    </section>
    {message && <p className="admin-success media-feedback" role="status">{message}</p>}{error && <p className="admin-error media-feedback" role="alert">{error}</p>}
    <section className="media-library media-library-inventory"><header><div><p className="eyebrow">Browse & manage</p><h2>Asset inventory</h2></div><p>{state.media.length ? `${state.media.length} files ready to use` : "Your next upload will appear here."}</p></header><MediaLibrary items={state.media} pending={pending} onCopy={copy} onDelete={remove} onReplace={chooseReplacement} onOptimize={optimize} /></section>
    <input ref={replaceInput} className="media-hidden-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={replaceSelected} aria-label={replacement ? `Replacement for ${replacement.displayName}` : "Choose a replacement image"} />
  {editorFile && <FilerobotEditor file={editorFile} onSave={(nextFile) => { setFile(nextFile); setEditorFile(null); setMessage("Image edits are ready to publish."); }} onClose={() => setEditorFile(null)} />}</section></main>;
}
