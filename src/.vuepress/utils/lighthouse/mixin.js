export default {
	mounted() {},
	updated() {
		let logo = document.querySelector(".logo");
		logo.height = logo.width = "48";
		let hero = document.querySelector(".hero > img");
		if (hero) {
			hero.height = "300";
			hero.width = "1920";
		}
	},
};
