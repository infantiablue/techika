const colors = require("tailwindcss/colors");

module.exports = {
	purge: {
		content: ["./src/.vuepress/theme/components/*.vue", "./src/.vuepress/components/*.vue", "./src/*.md"],
		options: {
			whitelist: ["html", "body"],
			whitelistPatternsChildren: [/^language-/, /^token/, /^pre/, /^code/],
		},
	},
	darkMode: "media", // or 'media' or 'class'
	theme: {
		extend: {
			colors: {
				primary: "#1d3557",
				secondary: "#2a9d8f",
				highlight: "#f4a261",
				gray: colors.coolGray,
				blue: colors.lightBlue,
				green: colors.emerald,
				red: colors.rose,
				pink: colors.fuchsia,
			},
			fontFamily: {
				sans: ["Graphik", "sans-serif"],
				serif: ["Merriweather", "serif"],
			},
		},
	},
	variants: {
		extend: {},
	},
	plugins: [require("@tailwindcss/forms")],
};
