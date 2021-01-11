<template>
	<main class="page">
		<slot name="top" />
		<div class="theme-default-content">
			<h1 class="text-indigo-600 font-serif">{{ $page.title }}</h1>
			<div class="my-2" v-if="$page.frontmatter.cover"><img :src="$page.frontmatter.cover" :alt="$page.title" width="660" height="195" /></div>
			<Content />
		</div>
		<PageEdit />

		<PageNav v-bind="{ sidebarItems }" />

		<slot name="bottom" />
		<div class="text-center">© 2021 Made with 🧡 by Truong Phan</div>
	</main>
</template>

<script>
import PageEdit from "@parent-theme/components/PageEdit.vue";
import PageNav from "@parent-theme/components/PageNav.vue";
import "@parent-theme/styles/wrapper.styl";
export default {
	components: { PageEdit, PageNav },
	props: ["sidebarItems"],
};
</script>

<style lang="stylus">
.page
  padding-bottom 2rem
  display block
</style>
