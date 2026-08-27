"use client";

import { useState } from "react";
import { FilerobotEditor } from "./filerobot-editor";

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
      return result;
    } catch (reason) {
      setError(reason.message || "Unable to publish media.");
    } finally { setPending(false); }
  }

  async function upload(event) {
    event.preventDefault();
    if (!file) return setError("Choose an image first.");
    const result = await run(async () => {
      const form = new FormData();
      form.set("file", file);
      return request("/api/admin/media", { method: "POST", body: form });
    }, "Image published.");
    if (result) { setFile(null); event.currentTarget.reset(); }
  }

  async function remove(imagePath) { if (window.confirm(`Delete ${imagePath}? This cannot be undone.`)) await run(() => request("/api/admin/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: imagePath }) }), "Image deleted."); }
  async function copy(imagePath) { await navigator.clipboard.writeText(imagePath); setMessage("Image URL copied."); }
  return <main className="admin-shell"><section className="media-studio">
    <header className="media-studio-header"><div><p className="eyebrow">Publishing studio</p><h1>Media library</h1><p>Upload reusable visuals now and choose them from an article when you are ready.</p></div></header>
    <form className="media-upload-panel standalone-media-upload" onSubmit={upload}><div className="media-panel-heading"><span>01</span><div><p className="eyebrow">New asset</p><h2>Upload an image</h2></div></div><label className="media-file-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile} required /><strong>{file ? file.name : "Choose an image"}</strong><span>{file ? "Use the full editor, then publish when ready." : "JPEG, PNG, WebP, or GIF · up to 10 MiB"}</span></label>{file && <button type="button" className="media-edit-button" onClick={() => setEditorFile(file)}>Edit image</button>}<p className="media-help">Assets are stored in the shared library and can be selected later from an article editor.</p><button className="media-publish-button" disabled={pending}>{pending ? "Publishing…" : "Publish image"}</button></form>
    {message && <p className="admin-success media-feedback" role="status">{message}</p>}{error && <p className="admin-error media-feedback" role="alert">{error}</p>}
    <section className="media-library"><header><div><p className="eyebrow">02 · Library</p><h2>Published assets</h2></div><p>{state.media.length} published assets</p></header><div className="media-grid">{state.media.map((item) => <article className="media-card" key={item.path}><div className="media-thumbnail"><img src={item.path} alt="" /></div><div className="media-card-body"><p title={item.path}>{item.name}</p><small>{Math.ceil(item.size / 1024)} KB</small></div><div className="media-card-actions"><button className="admin-secondary" onClick={() => copy(item.path)}>Copy URL</button><button className="admin-danger" onClick={() => remove(item.path)} disabled={pending}>Delete</button></div></article>)}</div></section>
  {editorFile && <FilerobotEditor file={editorFile} onSave={(nextFile) => { setFile(nextFile); setEditorFile(null); setMessage("Image edits are ready to publish."); }} onClose={() => setEditorFile(null)} />}</section></main>;
}
