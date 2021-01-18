export default {
	updated() {
		let hero = document.querySelector(".hero > img");
		if (hero) {
			hero.height = "325";
			hero.width = "1920";
		}
		let homeLink = document.querySelector("a.home-link");
		if (homeLink) homeLink.setAttribute("title", "Homepage");
	},
};
