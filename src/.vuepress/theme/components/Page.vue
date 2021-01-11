<template>
	<main class="container mx-auto pb-8 w-full md:w-10/12 lg:w-8/12 xl:w-6/12 pt-20">
		<slot name="top" />
		<div class="w-full px-2">
			<h1 class="text-gray-900 font-serif" v-if="$page.title">{{ $page.title }}</h1>
			<div class="flex">
				<div class="text-sm text-gray-500 mr-2" v-if="$page.frontmatter.date">📅 {{ new Date(Date.parse($page.frontmatter.date)).toDateString() }}</div>
				<div class="text-sm text-gray-500 mr-2" v-if="$page.frontmatter.author">✍️ {{ $page.frontmatter.author }}</div>
			</div>
			<div class="my-2" v-if="$page.frontmatter.cover"><img :src="$page.frontmatter.cover" :alt="$page.title" width="1024" height="195" /></div>
			<Content id="content" />
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
#content
  overflow-wrap break-word
</style>
