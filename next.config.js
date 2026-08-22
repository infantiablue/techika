const legacyHosts = /^(www\.)?(techika\.com|truongphan\.com)$/i;

/** @type {import('next').NextConfig} */
module.exports = {
  trailingSlash: true,
  async redirects() {
    return [
      { source: "/index.html", has: [{ type: "header", key: "host", value: legacyHosts.source }], destination: "https://truongphan.com/", permanent: true },
      { source: "/projects.html", has: [{ type: "header", key: "host", value: legacyHosts.source }], destination: "https://truongphan.com/projects/", permanent: true },
      { source: "/contact.html", has: [{ type: "header", key: "host", value: legacyHosts.source }], destination: "https://truongphan.com/contact/", permanent: true },
      { source: "/credits.html", has: [{ type: "header", key: "host", value: legacyHosts.source }], destination: "https://truongphan.com/credits/", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/projects.html", destination: "/projects", permanent: true },
      { source: "/contact.html", destination: "/contact", permanent: true },
      { source: "/credits.html", destination: "/credits", permanent: true },
      { source: "/:path*", has: [{ type: "header", key: "host", value: legacyHosts.source }], destination: "https://truongphan.com/:path*/", permanent: true },
    ];
  },
};
