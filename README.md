# My personal site

[![Netlify Status](https://api.netlify.com/api/v1/badges/b8f49dbc-85ce-45d6-a0e1-08b0cb131f05/deploy-status)](https://app.netlify.com/sites/truongphan/deploys)

Built on Next.js with Markdown posts in `src/blog/posts/`.

## Admin publishing

`/admin/` edits Markdown articles and their metadata, and uses the client-only Filerobot image editor (crop, resize, rotate, filters, annotation, and watermarking). Unpublished text changes are saved as browser-local drafts; publishing and media actions commit to GitHub, then Vercel deploys the normal Git update. Browser drafts are available only on the device and browser where they were written. Filerobot is pinned to its React 19 beta release because the stable line does not document React 19 support. Configure these environment variables locally and in Vercel:

```
ADMIN_PASSWORD=use-a-long-unique-password
ADMIN_SESSION_SECRET=use-a-long-random-secret
GITHUB_TOKEN=github-fine-grained-token-with-contents-read-write
GITHUB_REPOSITORY=infantiablue/techika
GITHUB_BRANCH=main
```

Keep the token server-side. Add a Vercel Firewall rate rule for `POST /api/admin/session` before exposing the admin login.
