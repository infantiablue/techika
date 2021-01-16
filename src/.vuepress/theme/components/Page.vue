<template>
	<div class="page container mx-auto pt-20 pb-8 w-full md:w-10/12 lg:w-8/12 xl:w-6/12">
		<slot name="top" />
		<div class="w-full px-6">
			<h1 class="font-serif text-left pb-6" v-if="$page.title">{{ $page.title }}</h1>
			<div class="flex py-1 dark:text-green-400">
				<div class="text-sm mr-2" v-if="$page.frontmatter.date">📅 {{ new Date(Date.parse($page.frontmatter.date)).toDateString() }}</div>
				<div class="text-sm mr-2" v-if="$page.frontmatter.author">✍️ {{ $page.frontmatter.author }}</div>
			</div>
			<div class="my-2" v-if="$page.frontmatter.image"><img :src="$page.frontmatter.image" :alt="$page.title" width="1024" height="195" /></div>
			<Content class="text-justify break-words dark:text-white" />
		</div>
		<PageEdit />
		<PageNav v-bind="{ sidebarItems }" />
		<slot name="bottom" />
		<div class="text-center">© 2021 Made with 🧡</div>
	</div>
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
