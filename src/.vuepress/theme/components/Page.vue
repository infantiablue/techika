<template>
	<div class="page container mx-auto pt-14 pb-8 w-full md:w-10/12 lg:w-8/12 xl:w-6/12">
		<slot name="top" />
		<div class="w-full px-6">
			<h1 class="text-left pb-6 font-medium" v-if="$page.title">{{ $page.title }}</h1>
			<div class="flex dark:text-green-400">
				<div class="text-sm mr-2" v-if="$page.frontmatter.date">📅 {{ new Date(Date.parse($page.frontmatter.date)).toDateString() }}</div>
				<div class="text-sm mr-2" v-if="$page.frontmatter.author">✍️ {{ $page.frontmatter.author }}</div>
				<a v-if="$page.frontmatter.author" class="twitter-share-button" :href="`https://twitter.com/intent/tweet?text=${$page.title}&url=https://techika.com${$page.path}`">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
						<path
							d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"
						/></svg
				></a>
			</div>
			<div class="my-2" v-if="$page.frontmatter.image"><img :src="$page.frontmatter.image" :alt="$page.title" width="1024" height="195" /></div>
			<Content class="text-justify break-words text-lg font-normal dark:text-gray-50" />
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
