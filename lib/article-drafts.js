export const articleDraftStorageKey = "techika_article_drafts_v1";

function text(value) { return typeof value === "string" ? value : ""; }

function normalizeDraft(value) {
  if (!value?.article || typeof value.article !== "object") return null;
  const article = value.article;
  return { article: { slug: text(article.slug), title: text(article.title), description: text(article.description), author: text(article.author), date: text(article.date), tags: Array.isArray(article.tags) ? article.tags.map(text).filter(Boolean) : [], image: text(article.image), imageAlt: text(article.imageAlt), featured: article.featured === true, content: text(article.content) }, baseSlug: text(value.baseSlug), updatedAt: text(value.updatedAt) };
}

export function readArticleDrafts(storage) {
  try {
    const value = JSON.parse(storage.getItem(articleDraftStorageKey) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([key, draft]) => [key, normalizeDraft(draft)]).filter(([, draft]) => draft));
  } catch { return {}; }
}

export function saveArticleDraft(storage, key, draft) {
  const drafts = readArticleDrafts(storage);
  drafts[key] = draft;
  storage.setItem(articleDraftStorageKey, JSON.stringify(drafts));
  return drafts;
}

export function removeArticleDraft(storage, key) {
  const drafts = readArticleDrafts(storage);
  delete drafts[key];
  storage.setItem(articleDraftStorageKey, JSON.stringify(drafts));
  return drafts;
}

export function articleDraftKey(slug) { return `published:${slug}`; }
