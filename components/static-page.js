import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Markdown } from "./markdown";
import { Footer, Header } from "./site";

export function getStaticPage(page) {
  const { data, content } = matter(fs.readFileSync(path.join(process.cwd(), "src", `${page}.md`), "utf8"));
  return { title: data.title, content: content.replace("assets/img/darkmode.ebc0d14f.png", "/media/vhnews-tutorials-p2/darkmode.png").replace(/<Badge text="([^"]+)"(?: type="warning")?[^>]*\/>/g, '<span class="badge">$1</span>').replace(/<style[\s\S]*?<\/style>/g, "") };
}

export function StaticPage({ page }) {
  const content = getStaticPage(page);
  return <><Header /><main className="page" id="main-content"><h1>{content.title}</h1><article className={`markdown ${page}`}><Markdown>{content.content}</Markdown></article></main><Footer /></>;
}
