// const path = require("path");
// class TailwindExtractor {
// 	static extract(content) {
// 		return content.match(/[A-Za-z0-9-_:\/]+/g) || [];
// 	}
// }
module.exports = {
	purge: {
		content: ["./src/.vuepress/theme/components/*.vue", "./src/.vuepress/components/*.vue", "./src/*.md"],
		options: {
			// safelist: ["container", "mx-auto", "flex", "text-justify", "main", /^sm?/i, /^md?/i, /^lg?/i, /^xl?/i, "w-full"],
			whitelist: ["html", "body"],
			whitelistPatternsChildren: [/^language-/, /^token/, /^pre/, /^code/],
		},
	},
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {
			colors: {
				primary: "#1d3557",
				secondary: "#2a9d8f",
				highlight: "#f4a261",
			},
		},
	},
	variants: {
		extend: {},
	},
	plugins: [],
};
