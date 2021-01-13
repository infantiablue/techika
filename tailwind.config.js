const path = require("path");
class TailwindExtractor {
	static extract(content) {
		return content.match(/[A-Za-z0-9-_:\/]+/g) || [];
	}
}
module.exports = {
	purge: {
		layers: ["components"],
		content: [path.join(__dirname, "..", "components", "*.vue"), path.join(__dirname, "..", "theme", "components", "*.vue"), path.join(__dirname, "..", "theme", "layouts", "*.vue"), path.join(__dirname, "..", "theme", "templates", "*.html")],
		whitelist: ["html", "body", "main"],
		whitelistPatternsChildren: [/^o-rich-text$/, /^language-/, /^sw-update-popup/, /^token/, /^pre/, /^code/],
		whitelistPatterns: [/^o-/, /^c-/, /^js-/],
		extractors: [
			{
				extractor: TailwindExtractor,
				extensions: ["html", "vue"],
			},
		],
	},
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {},
	},
	variants: {
		extend: {},
	},
	plugins: [],
};
