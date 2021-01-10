module.exports = {
	title: "Truong Phan Blog",
	description: "My awesome portfolio blog",
	head: [["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" }]],
	themeConfig: {
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Blog", link: "/blog/" },
		],
	},
	plugins: [
		[
			"@vuepress/google-analytics",
			{
				ga: "G-LV7MVE919H",
			},
		],
	],
};
