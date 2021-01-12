<template>
	<Navbar />
</template>

<script>
import Navbar from "@parent-theme/components/Navbar.vue";
export default {
	components: { Navbar },
	mounted() {
		console.log("mounted");
		let logo = document.querySelector(".logo");
		logo.height = logo.width = "48";
		let hero = document.querySelector(".hero > img");
		if (hero) {
			hero.height = "300";
			hero.width = "1920";
		}
	},
};
</script>
