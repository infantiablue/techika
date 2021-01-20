export default ({
	Vue, // the version of Vue being used in the VuePress app
	options, // the options for the root Vue instance
	router, // the router instance for the app
	siteData, // site metadata
}) => {
	//set up dark theme
	require("./styles/dark.css");
	if (!("theme" in localStorage)) localStorage.theme = "dark";
	let htmlElm = document.querySelector("html");
	localStorage.theme === "light" ? htmlElm.classList.remove("dark") : htmlElm.classList.add("dark");
	options.mounted = function() {};
};
