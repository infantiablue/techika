export default {
	mounted() {},
	updated() {
		// let logo = document.querySelector(".logo");
		// logo.height = logo.width = "48";
		let hero = document.querySelector(".hero > img");
		if (hero) {
			hero.height = "325";
			hero.width = "1920";
		}
		let homeLink = document.querySelector("a.home-link");
		// console.log(homeLink);
		if (homeLink) homeLink.setAttribute("title", "Homepage");
	},
};
