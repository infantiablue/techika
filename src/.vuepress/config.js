const path = require("path");
const { googleAnalyticsPlugin } = require("@vuepress/plugin-google-analytics");
module.exports = {
	evergreen: true,
	title: "Truong Phan's Personal Blog",
	description: "My awesome personal site about web development and hobbies",
	head: [
		["meta", { name: "viewport", content: "width=device-width, maximum-scale=5" }],
		["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" }],
		// ["script", { src: "https://platform.twitter.com/widgets.js" }],
	],
	alias: {
		styles: path.resolve(__dirname, "./styles"),
	},
	postcss: {
		plugins: [require("autoprefixer"), require("tailwindcss")("./tailwind.config.js")],
	},
	themeConfig: {
		search: false,
		domain: "https://techika.com",
		author: {
			name: "Truong Phan",
			twitter: "infantiablue",
		},
		// logo: "/assets/img/avatar_sm.png",
		lastUpdated: "Last Updated",
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Blog", link: "/blog/" },
			{ text: "Projects", link: "/projects" },
			{ text: "Contact", link: "/contact" },
		],
	},
	plugins: [
		[require("./utils/lighthouse/index.js")],
		// ["@vuepress/search", { searchMaxSuggestions: 10 }],
		["@vuepress/google-analytics-plugin", { ga: "G-N5GN92FFNF" }],
		// [googleAnalyticsPlugin({ id: "G-N5GN92FFNF" })],
		[
			"@vuepress/blog",
			{
				directories: [
					{
						id: "post",
						dirname: "blog/posts",
						path: "/posts/",
					},
				],
			},
		],
		[
			"@vuepress/last-updated",
			{
				transformer: (timestamp) => {
					const timeago = require("timeago.js");
					return timeago.format(timestamp);
				},
			},
		],
		[
			"seo",
			{
				siteTitle: (_, $site) => $site.title,
				title: ($page) => $page.title,
				description: ($page) => $page.frontmatter.description,
				author: (_, $site) => $site.themeConfig.author,
				tags: ($page) => $page.frontmatter.tags,
				twitterCard: (_) => "summary_large_image",
				type: ($page) => (["articles", "posts", "blog"].some((folder) => $page.regularPath.startsWith("/" + folder)) ? "article" : "website"),
				url: (_, $site, path) => ($site.themeConfig.domain || "") + path,
				image: ($page, $site) =>
					$page.frontmatter.image && $page.frontmatter.image.startsWith("http") ? $page.frontmatter.image : $site.themeConfig.domain + $page.frontmatter.image,
				publishedAt: ($page) => $page.frontmatter.date && new Date($page.frontmatter.date),
				modifiedAt: ($page) => $page.lastUpdated && new Date($page.lastUpdated),
			},
		],
	],
};
