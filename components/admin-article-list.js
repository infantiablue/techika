"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { articleDraftKey, readArticleDrafts, removeArticleDraft } from "../lib/article-drafts";

export function AdminArticleList({ articles }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState({});
  useEffect(() => { setDrafts(readArticleDrafts(window.localStorage)); }, []);

  const published = articles.map((article) => {
    const draftKey = articleDraftKey(article.slug);
    const draft = drafts[draftKey];
    const browserDraft = Boolean(draft?.article);
    return { ...article, ...(draft?.article || {}), draftKey, browserDraft, publishedFeatured: article.featured === true, isDraft: article.localDraft || browserDraft, href: `/admin/edit/${article.slug}/` };
  });
  const unpublished = Object.entries(drafts).filter(([key, draft]) => !key.startsWith("published:") && draft?.article).map(([draftKey, draft]) => ({ ...draft.article, draftKey, isDraft: true, href: draftKey === "new" ? "/admin/edit/new/" : `/admin/edit/draft/${draftKey}/` }));

  function discard(draftKey) {
    if (!window.confirm("Discard this browser-local draft?")) return;
    try { setDrafts(removeArticleDraft(window.localStorage, draftKey)); } catch {}
  }

  return <main className="admin-shell"><section className="article-listing">
    <header className="media-studio-header"><div><p className="eyebrow">Publishing studio</p><h1>Articles</h1><p>Select an article or continue a browser draft.</p></div><div className="media-header-actions"><button className="admin-secondary" type="button" onClick={() => router.push(`/admin/edit/draft/${crypto.randomUUID()}/`)}>New article</button></div></header>
    <div className="article-card-grid">{[...unpublished, ...published].map((article) => <article className="article-list-card" key={article.draftKey}>{article.image ? <img src={article.image} alt="" /> : <div className="article-list-placeholder" aria-hidden="true">No cover</div>}<div><div className="article-card-meta"><time dateTime={article.date}>{article.date || "No date"}</time>{article.publishedFeatured && <span>Featured</span>}<span>{article.localDraft ? "Local draft" : article.browserDraft ? "Browser draft" : article.status === "published" ? "Published" : "Draft"}</span></div><h2>{article.title || "Untitled draft"}</h2><p>{article.description || "No description."}</p><div className="article-card-actions"><Link href={article.href}>{article.isDraft ? "Continue editing" : "Edit article"} <span aria-hidden="true">→</span></Link>{article.browserDraft && <button type="button" onClick={() => discard(article.draftKey)}>Discard</button>}</div></div></article>)}</div>
  </section></main>;
}
