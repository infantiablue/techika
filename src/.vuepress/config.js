module.exports = {
	title: "Truong Phan",
	description: "My awesome portfolio blog",
	head: [
		["meta", { name: "viewport", content: "width=device-width, maximum-scale=5" }],
		["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" }],
	],
	themeConfig: {
		logo: "/img/avatar.jpg",
		lastUpdated: "Last Updated",
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Blog", link: "/blog/" },
			{ text: "Projects", link: "/projects" },
		],
	},
	plugins: [
		["@vuepress/search", { searchMaxSuggestions: 10 }],
		[
			"@vuepress/last-updated",
			{
				transformer: (timestamp) => {
					const timeago = require("timeago.js");
					return timeago.format(timestamp);
				},
			},
		],
		"@kawarimidoll/tailwind",
		["@vuepress/google-analytics", { ga: "UA-545029-29" }],
	],
};
