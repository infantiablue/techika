<template>
	<div>
		<div class="p-1 pl-2" v-for="page in pages" :key="page.frontmatter.date">
			<hr class="my-2" />
			<h3 class="text-left font-bold text-lg">
				<router-link :to="page.path">{{ page.title }}</router-link>
			</h3>
		</div>
	</div>
</template>
<script>
export default {
	data() {
		return {
			pages: [],
		};
	},
	mounted() {
		this.$site.pages.forEach((page) => {
			if (page.frontmatter.type === "article") {
				this.pages.push(page);
				this.pages.sort((a, b) => {
					let aTime = new Date(a.frontmatter.date).getTime();
					let bTime = new Date(b.frontmatter.date).getTime();
					return bTime - aTime;
				});
			}
		});
	},
	// beforeDestroy() {
	// 	ga("send", "event", { eventCategory: "newsletter", eventAction: "submit", eventLabel: "subscribe", eventValue: 1 });
	// },
};
</script>
<style lang="stylus" scoped>
.post-container
	width 100%

.post-card
	margin 10px
	border 1px solid cadetblue
	border-radius 3px
	padding 10px
	align-items center

.article-image
	height 100%
	padding-right 15px

.description
	width 100%
	color dimgrey
	justify-content center
</style>
