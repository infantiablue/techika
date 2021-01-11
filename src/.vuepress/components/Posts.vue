<template>
	<div class="container mx-auto">
		<div v-for="page in pages">
			<div class="w-auto p-0 mb-3">
				<router-link :to="page.path"><img class="w-auto px-0 py-0" :src="page.frontmatter.cover" alt=""/></router-link>
				<div class="page-detail px-2 py-2">
					<div class="page-title">
						<h2 class="text-3xl font-sans">
							<router-link :to="page.path">{{ page.title }}</router-link>
						</h2>
						<div class="flex flex-row py-1">
							<div class="text-sm text-gray-500 mr-2" v-if="page.frontmatter.date">📅 {{ new Date(Date.parse(page.frontmatter.date)).toDateString() }}</div>
							<div class="text-sm text-gray-500 mr-2" v-if="page.frontmatter.author">✍️ {{ page.frontmatter.author }}</div>
						</div>
					</div>
					<div class="page-description text-gray-600">{{ page.frontmatter.description }}</div>
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
			}
		});
	},
};
</script>
<style scoped>
.post-container {
	width: 100%;
}
.post-card {
	margin: 10px;
	border: 1px solid cadetblue;
	border-radius: 3px;
	padding: 10px;
	align-items: center;
}
.article-image {
	height: 100%;
	padding-right: 15px;
}
.description {
	width: 100%;
	color: dimgrey;
	justify-content: center;
}
</style>
