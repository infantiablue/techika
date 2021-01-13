const path = require("path");

module.exports = {
	purge: {
		layers: ["base", "components"],
		content: [path.join(__dirname, "..", "components", "*.vue"), path.join(__dirname, "..", "theme", "components", "*.vue"), path.join(__dirname, "..", "theme", "layouts", "*.vue"), path.join(__dirname, "..", "theme", "templates", "*.html")],
		whitelist: ["html", "body", "main"],
		defaultExtractor(content) {
			const contentWithoutStyleBlocks = content.replace(/<style[^]+?<\/style>/gi, "");
			return contentWithoutStyleBlocks.match(/[A-Za-z0-9-_/:]*[A-Za-z0-9-_/]+/g) || [];
		},
		safelist: [/-(leave|enter|appear)(|-(to|from|active))$/, /^(?!(|.*?:)cursor-move).+-move$/, /^router-link(|-exact)-active$/, /data-v-.*/],
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
