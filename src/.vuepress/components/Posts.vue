<template>
	<div>
		<div v-for="page in pages" :key="page.frontmatter.date">
			<div class="w-auto p-0 mb-3">
				<div class="page-detail px-2 py-2">
					<div class="page-title">
						<h2 class="text-2xl text-left font-bold">
							<router-link :to="page.path">{{ page.title }}</router-link>
						</h2>
						<div class="flex flex-row py-2 dark:text-green-400">
							<div class="text-sm mr-2" v-if="page.frontmatter.date">📅 {{ new Date(Date.parse(page.frontmatter.date)).toDateString() }}</div>
							<div class="text-sm mr-2" v-if="page.frontmatter.author">✍️ {{ page.frontmatter.author }}</div>
							<a class="twitter-share-button" :href="`https://twitter.com/intent/tweet?text=${page.title}&url=https://techika.com${page.path}`">
								<svg class="fill-current text-gray-900 dark:text-blue-500" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
									<path
										d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"
									/></svg
							></a>
						</div>
						<router-link :to="page.path" v-if="page.frontmatter.image"><img class="w-auto px-0 py-0" :src="page.frontmatter.image" alt=""/></router-link>
					</div>
					<div class="page-description text-gray-600 dark:text-white mt-2">{{ page.frontmatter.description }}</div>
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
					return bTime - aTime;
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
