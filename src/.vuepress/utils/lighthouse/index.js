const { path } = require("@vuepress/shared-utils");
module.exports = () => ({
	define: {
		LOGO: ".logo",
		HERO: ".hero > img",
	},
	clientRootMixin: path.resolve(__dirname, "mixin.js"),
});
