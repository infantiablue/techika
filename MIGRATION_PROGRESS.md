# truongphan.com migration tracker

**Goal:** move Techika from VuePress at `techika.com` to a visually equivalent Next.js site at `truongphan.com`, hosted on Vercel.

| Status | Work item | Acceptance criteria | Owner | Notes |
| --- | --- | --- | --- | --- |
| ✅ Complete | Capture current-site baseline | Screenshots of all public pages at desktop and mobile widths; route and metadata inventory recorded | Codex | Checked-in VuePress build supplied route/metadata baseline; desktop and mobile home snapshots plus article rendering were compared locally |
| ✅ Complete | Preserve content and assets | All 8 posts, static pages, and existing images are available in the Next.js source tree | Codex | Markdown remains in `src/`; public assets are copied during migration |
| ✅ Complete | Create Next.js foundation | Local development and production build succeed; no VuePress runtime remains | Codex | Next.js 16 production build passes; obsolete runtime dependencies, config, and `src/.vuepress` application tree removed |
| ✅ Complete | Recreate routes | Home, blog, posts, projects, contact, credits, and dated post routes render | Codex | All public routes return 200; eight dated Markdown posts are statically generated |
| ✅ Complete | Port the design | Dark-first layout, navigation, homepage, post listings, article pages, newsletter block, and responsive styling match the baseline | Codex | Desktop/mobile home and article checks pass; responsive native-details menu replaces Vue sidebar behavior |
| ✅ Complete | Preserve SEO and analytics | Page metadata, article metadata, sitemap, robots.txt, canonical URLs, and GA4 work on `truongphan.com` | Codex | Metadata, canonical URLs, sitemap, robots, and GA4 `G-N5GN92FFNF` verified in local production output |
| ✅ Complete | Add compatibility redirects | Old `.html` paths and all `techika.com` paths permanently redirect to the matching `truongphan.com` route | Codex | Local 308 checks cover all legacy `.html` routes and representative `techika.com` paths |
| ✅ Complete | Deploy preview to Vercel | GitHub-connected Vercel project builds successfully and preview passes visual and route checks | Codex | Preview: `techika-4ghcqtigt-infantiablues-projects.vercel.app`. Project framework is Next.js, Git-to-`main` was confirmed by the operator, and authenticated checks return 200 for every required route. |
| 🟡 In progress | Attach new domain | `truongphan.com` and `www.truongphan.com` resolve over HTTPS; `truongphan.com` is canonical | Codex | Both domains are assigned to Vercel `techika`; GoDaddy DNS must point `@` and `www` to `76.76.21.21` before verification can finish. |
| ⬜ Not started | Production cutover | Production verification passes and `techika.com` redirects remain active |  | Retain old domain for at least 12 months |

## Verification checklist

- [x] `npm run build` succeeds from a clean install.
- [x] Each current public URL has a matching page or permanent redirect.
- [x] All posts retain their title, date, author, image, and body content.
- [x] Desktop and mobile rendering match the captured baseline.
- [x] Metadata, sitemap, robots, analytics, contact links, social links, and newsletter form work.
- [ ] `truongphan.com` is canonical; `www.truongphan.com` and `techika.com` redirect correctly. (Deferred: no custom domains or DNS changes were authorized.)
