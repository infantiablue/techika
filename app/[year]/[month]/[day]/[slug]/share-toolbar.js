"use client";

import { useState } from "react";
import styles from "./follow.module.css";

export function ShareToolbar({ title, url }) {
  const [message, setMessage] = useState("");
  const encodedUrl = encodeURIComponent(url);
  const encodedPost = encodeURIComponent(`${title}\n${url}`);
  const networks = [
    ["X", `https://x.com/intent/post?text=${encodedPost}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`],
    ["Bluesky", `https://bsky.app/intent/compose?text=${encodedPost}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`],
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch {
      setMessage("Could not copy the link. Copy it from the address bar.");
    }
  }

  return <section className={styles.share} aria-labelledby="share-title">
    <h2 id="share-title">Share this article</h2>
    <div className={styles.shareActions}>
      {networks.map(([label, href]) => <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${label}`} key={label}>{label}<b aria-hidden="true">↗</b></a>)}
      <button type="button" onClick={copyLink}>{message === "Link copied." ? "Copied" : "Copy link"}</button>
    </div>
    <p className={styles.shareStatus} role="status" aria-live="polite">{message}</p>
  </section>;
}
