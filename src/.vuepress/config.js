module.exports = {
	title: "Truong Phan",
	description: "My awesome portfolio blog",
	head: [["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" }]],
	themeConfig: {
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Blog", link: "/blog/" },
			{ text: "Projects", link: "/projects" },
		],
	},
	plugins: ["@kawarimidoll/tailwind", ["@vuepress/google-analytics", { ga: "UA-545029-29" }]],
};
