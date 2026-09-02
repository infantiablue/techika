"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { filterMedia } from "../lib/media-rules";

export function MediaLibrary({ items, articleSlug = "", currentCover = "", coverDisabled = false, pending, onCopy, onDelete, onReplace, onOptimize, onUseCover }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(articleSlug ? "article" : "all");
  const visible = useMemo(() => filterMedia(items, { filter, query, articleSlug }), [articleSlug, filter, items, query]);

  return <>
    <div className="media-library-tools">
      <label>Search images<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filename or article" /></label>
      <label>Show<select value={filter} onChange={(event) => setFilter(event.target.value)}>{articleSlug && <option value="article">This article</option>}<option value="all">All assets</option><option value="shared">Shared</option>{!articleSlug && <><option value="used">Used</option><option value="unused">Unused</option></>}</select></label>
    </div>
    {visible.length ? <div className="media-grid">{visible.map((item) => {
      const used = item.usages.length > 0;
      const context = item.article?.title || (item.folder === "library" ? "Shared library" : item.folder);
      return <article className="media-card" key={item.path}>
        <div className="media-thumbnail"><Image src={item.path} alt="" fill sizes="(max-width: 720px) 100vw, 240px" unoptimized={item.extension === "svg"} />{currentCover === item.path && <span>Current cover</span>}</div>
        <div className="media-card-body"><div><p title={item.path}>{item.displayName}</p><small>{context}</small></div><small>{Math.ceil(item.size / 1024)} KB</small></div>
        <p className="media-usage"><span>{item.status}</span>{used ? `Used ${item.usages.length} time${item.usages.length === 1 ? "" : "s"}` : "Safe to delete"}</p>
        <div className="media-card-actions">
          <button type="button" className="admin-secondary media-icon-button" onClick={() => onCopy(item)} aria-label={`Copy URL for ${item.displayName}`} title="Copy URL"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="1" /><path d="M16 8V6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2" /></svg></button>
          {onUseCover && item.coverEligible && <button type="button" className="admin-secondary" onClick={() => onUseCover(item)} disabled={pending || coverDisabled} title={coverDisabled ? "Add a cover description first." : ""} aria-label={`Use ${item.displayName} as cover`}>Use as cover</button>}
          <button type="button" className="admin-secondary media-icon-button" onClick={() => onReplace(item)} disabled={pending} aria-label={`Replace ${item.displayName}`} title="Replace"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 1-2-5l3 3" /></svg></button>
          {item.optimizable && <button type="button" className="admin-secondary media-icon-button" onClick={() => onOptimize(item)} disabled={pending} aria-label={`Optimize ${item.displayName}`} title="Optimize"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 4 1.2 3.8L19 9l-3.8 1.2L14 14l-1.2-3.8L9 9l3.8-1.2L14 4Z" /><path d="m6 14 .8 2.2L9 17l-2.2.8L6 20l-.8-2.2L3 17l2.2-.8L6 14Z" /></svg></button>}
          <button type="button" className="admin-danger" onClick={() => onDelete(item)} disabled={pending || used} title={used ? "Remove article references before deleting this image." : ""} aria-label={`Delete ${item.displayName}`}>Delete</button>
        </div>
      </article>;
    })}</div> : <p className="media-empty">No images match this view.</p>}
  </>;
}
