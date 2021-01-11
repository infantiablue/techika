<template>
	<div class="container mx-auto">
		<div v-for="page in pages">
			<div class="w-auto p-0 mb-3">
				<router-link :to="page.path"><img class="w-auto px-0 py-0" :src="page.frontmatter.cover" alt=""/></router-link>
				<div class="page-detail px-2 py-2">
					<router-link :to="page.path">
						<div class="page-title">
							<h2 class="text-3xl font-sans">{{ page.title }}</h2>
						</div>
					</router-link>
					<div class="page-description text-gray-500">{{ page.frontmatter.description }}</div>
					<!-- <div class="page-author">Author: {{ page.frontmatter.author }}</div> -->
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
	display: block;
	/* flex-wrap: wrap; */
	width: 100%;
}
.page-title {
	font-size: 1.2rem;
}

.post-card {
	/* width: 600px;
	height: 150px; */
	margin: 10px;
	border: 1px solid cadetblue;
	border-radius: 3px;
	padding: 10px;
	/* display: flex; */
	align-items: center;
}
.article-image {
	height: 100%;
	padding-right: 15px;
}
.description {
	width: 100%;
	color: dimgrey;
	/* display: flex; */
	justify-content: center;
}
</style>
