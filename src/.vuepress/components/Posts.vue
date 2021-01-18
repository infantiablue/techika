<template>
	<div>
		<div v-for="page in pages" :key="page.frontmatter.date">
			<div class="w-auto p-0 mb-3">
				<div class="page-detail px-2 py-2">
					<div class="page-title">
						<h2 class="text-3xl font-serif text-left">
							<router-link :to="page.path">{{ page.title }}</router-link>
						</h2>
						<div class="flex flex-row py-2 dark:text-green-400">
							<div class="text-sm mr-2" v-if="page.frontmatter.date">📅 {{ new Date(Date.parse(page.frontmatter.date)).toDateString() }}</div>
							<div class="text-sm mr-2" v-if="page.frontmatter.author">✍️ {{ page.frontmatter.author }}</div>
						</div>
						<router-link :to="page.path" v-if="page.frontmatter.image"><img class="w-auto px-0 py-0" :src="page.frontmatter.image" alt=""/></router-link>
					</div>
					<div class="page-description text-gray-600 dark:text-white">{{ page.frontmatter.description }}</div>
				</div>
			</div>
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
					if (aTime > bTime) return -1;
					if (aTime < bTime) return 1;
					return 0;
				});
			}
		});
	},
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
