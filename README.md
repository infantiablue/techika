# My personal site

[![Netlify Status](https://api.netlify.com/api/v1/badges/b8f49dbc-85ce-45d6-a0e1-08b0cb131f05/deploy-status)](https://app.netlify.com/sites/truongphan/deploys)

Built on Next.js with Markdown posts in `src/blog/posts/`.

## Admin publishing

`/admin/` edits Markdown articles and their metadata, and uses the client-only Filerobot image editor (crop, resize, rotate, filters, annotation, and watermarking). The media library accepts reusable standalone images; an article editor can select one later as a cover. Article banners and covers use **1200 × 675 pixels (16:9)** by default. Unpublished text changes are saved as browser-local drafts; publishing and media actions commit to GitHub, then Vercel deploys the normal Git update. Browser drafts are available only on the device and browser where they were written. Filerobot is pinned to its React 19 beta release because the stable line does not document React 19 support. Configure these environment variables locally and in Vercel:

```
ADMIN_PASSWORD=use-a-long-unique-password
ADMIN_SESSION_SECRET=use-a-long-random-secret
GITHUB_TOKEN=github-fine-grained-token-with-contents-read-write
GITHUB_REPOSITORY=infantiablue/techika
GITHUB_BRANCH=main
OPENAI_API_KEY=server-only-openai-api-key
RESEND_API_KEY=re_server-only-resend-api-key
RESEND_SEGMENT_ID=your-resend-segment-uuid
NEWSLETTER_FROM=Truong Phan <newsletter@truongphan.com>
NEWSLETTER_CONFIRMATION_SECRET=use-a-long-random-secret
NEWSLETTER_PROVIDER=resend
CRON_SECRET=use-a-long-random-secret
```

Keep the token server-side. Add Vercel Firewall rate rules for `POST /api/admin/session` and `POST /api/newsletter/subscribe` before exposing either public form.

## Newsletter

Article readers can subscribe from the article footer. They confirm their email before being added to the configured Resend Segment. Vercel creates a provider draft every Friday at 09:00 ICT from posts first published since the last sent weekly digest. Review, export, or explicitly send drafts in `/admin/newsletter/`. Create the Segment and set the newsletter variables in Vercel before enabling this flow.
