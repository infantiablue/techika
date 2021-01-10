module.exports = {
	title: "Truong Phan Blog",
	description: "My awesome portfolio blog",
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
