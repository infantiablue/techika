import Link from "next/link";
import { AdminLogin } from "../../components/admin-login";
import { hasAdminSession } from "../../lib/admin";
import { getAdminState } from "../../lib/github-media";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!await hasAdminSession()) return <AdminLogin />;

  const { articles, media } = await getAdminState();
  const published = articles.filter((article) => article.status === "published");
  const drafts = articles.length - published.length;
  const featured = published.find((article) => article.featured);

  return <main className="admin-shell"><section className="admin-dashboard">
    <header className="media-studio-header"><div><p className="eyebrow">Techika publishing</p><h1>Dashboard</h1><p>Write, review, and publish from one quiet workspace.</p></div></header>
    <section className="admin-dashboard-lead">
      <div><p className="eyebrow">Currently featured</p><h2>{featured?.title || "No featured article"}</h2>{featured ? <Link className="arrow-link" href={`/admin/edit/${featured.slug}/`}>Edit featured article <span aria-hidden="true">→</span></Link> : <p className="media-muted">Choose an article and enable “Feature on homepage.”</p>}</div>
      <dl><div><dt>Published</dt><dd>{published.length}</dd></div><div><dt>Drafts</dt><dd>{drafts}</dd></div><div><dt>Media assets</dt><dd>{media.length}</dd></div></dl>
    </section>
    <nav className="admin-dashboard-actions" aria-label="Publishing actions"><Link href="/admin/edit/new/"><span>Write</span><strong>New article</strong><small>Start with Markdown and metadata.</small></Link><Link href="/admin/articles/"><span>Library</span><strong>All articles</strong><small>Edit published articles and drafts.</small></Link><Link href="/admin/media/"><span>Assets</span><strong>Media library</strong><small>Upload images and manage article covers.</small></Link></nav>
    <section className="admin-dashboard-recent"><header><div><p className="eyebrow">Recently updated</p><h2>Articles</h2></div><Link href="/admin/articles/">View all</Link></header><div>{articles.slice(0, 4).map((article) => <Link href={`/admin/edit/${article.slug}/`} key={article.slug}><span><strong>{article.title}</strong><small>{article.localDraft ? "Local draft" : article.featured ? "Featured" : article.status === "published" ? "Published" : "Draft"}</small></span><time dateTime={article.date}>{article.date}</time><b aria-hidden="true">→</b></Link>)}</div></section>
  </section></main>;
}
