<template>
	<div class="post-container">
		<div v-for="page in pages">
			<div class="post-card">
				<!-- <img class="article-image" src="https://picsum.photos/300" /> -->
				<div class="page-detail">
					<router-link :to="page.path">
						<div class="page-title">
							{{ page.title }}
						</div>
					</router-link>
					<div class="page-description">{{ page.frontmatter.description }}</div>
					<div class="page-author">Author: {{ page.frontmatter.author }}</div>
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
