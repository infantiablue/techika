export const coverSize = Object.freeze({ width: 1200, height: 675 });

export function filterMedia(items, { filter, query, articleSlug = "" }) {
  const text = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesQuery = !text || [item.displayName, item.path, item.article?.title, ...item.usages.map((usage) => usage.title)].some((value) => value?.toLowerCase().includes(text));
    if (!matchesQuery) return false;
    if (filter === "used") return item.usages.length > 0;
    if (filter === "unused") return item.usages.length === 0;
    if (filter === "shared") return item.folder === "library" || new Set(item.usages.map((usage) => usage.slug)).size > 1;
    if (filter === "article") return item.folder === articleSlug || item.usages.some((usage) => usage.slug === articleSlug);
    return true;
  });
}
