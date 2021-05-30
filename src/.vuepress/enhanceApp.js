export default ({
	Vue, // the version of Vue being used in the VuePress app
	options, // the options for the root Vue instance
	router, // the router instance for the app
	siteData, // site metadata
}) => {
	//set up dark theme
	require("./styles/dark.css");
	const isBrowser = typeof window !== "undefined";
	if (isBrowser) {
		document.querySelector("html").classList.add("dark");
		window.addEventListener("scroll", () => {
			let header = document.querySelector("header");
			window.screen.width > 425 && window.scrollY > 60 ? (header.style.backgroundColor = "rgba(170, 170, 170, 0.8)") : (header.style.backgroundColor = "");
		});
	}
	// if (!("theme" in localStorage)) localStorage.theme = "dark";
	// options.created = function() {
	// 	let htmlElm = document.querySelector("html");
	// 	localStorage.theme === "dark" ? htmlElm.classList.add("dark") : htmlElm.classList.remove("dark");
	// };
};
