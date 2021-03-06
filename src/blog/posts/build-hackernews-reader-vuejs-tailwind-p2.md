---
title: Build the HackerNews Reader with VueJS 3 — Part 2, with Dark mode implemented
description: Step by step, with detailed explanations, to build the HackerNews Reader using Vue 3, Vite 2, VueX 4 & Tailwind, with the implementation of dark mode and more.
author: Truong Phan
type: article
image: /media/vhnews-tutorials-p2/banner.jpg
date: 2021-01-16
tags:
  - tutorial
  - vuejs
  - taildwind
  - vite
  - vuex
  - api
  - darkmode
---
After building a very basic Single Page Application (SPA) from [the first tutorial with VueJS 3](https://techika.com/2021/01/09/build-hackernews-reader-vuejs-tailwind-p1/), today we gonna continue to enhance the application. In the tutorials, I would try to explain in details why I use this but not that, as well as some concepts behind the scenes. Our goals in this part are:

- *Fetch more kinds of items from HackerNews (previously, the site just received only ***top*** stories) with a proper mini navigation.*
- *Nowadays, dark mode is a first-class feature for any application, so we will equip it for our application either.*
- *Implement `localStorage` to save user preferences: the last selected topic, and dark/light mode*
  
## Fetch more topics of stories from HackerNews API

We use the current [release](https://github.com/infantiablue/vhnews/releases/tag/0.1) from Github to continue development. Look at the HackerNews homepage, we can see it has other topics such as *new, jobs , asks ...* and go through the [official API](https://github.com/HackerNews/API), all of them are supported through REST APIs. Here are screenshots from the official site & URL endpoints:

![The official HackerNews screenshot](../../.vuepress/public/media/vhnews-tutorials-p2/hnews_screenshot.png)

```html

https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty
https://hacker-news.firebaseio.com/v0/beststories.json?print=pretty
https://hacker-news.firebaseio.com/v0/newstories.json?print=pretty
https://hacker-news.firebaseio.com/v0/askstories.json?print=pretty
https://hacker-news.firebaseio.com/v0/showstories.json?print=pretty
https://hacker-news.firebaseio.com/v0/jobstories.json?print=pretty
```

When examining the URL endpoints, there is a pattern, which we can make use for our app: `${topic}stories`. Let's implement in the user interface. Firstly, we add a property to Vue app in `App.vue` fille, an array with topics, and their titles:

```javascript

data() {
  return {
    topics: [
      { key: "top", title: "Top" },
      { key: "new", title: "New" },
      { key: "best", title: "Best" },
      { key: "ask", title: "Ask" },
      { key: "show", title: "Show" },
      { key: "job", title: "Jobs" },
    ],
  };
}
```

With this design of data structure, we can customize such as icons, color ... for the topic navigation with ease. Then, we generate the navigation bar by using `v-for`

```html

<div class="flex items-baseline">
  <div class="flex text-blue-500 text-xl">
    <span class="tab mr-2 cursor-pointer font-serif" v-for="topic in topics" :key="topic.key" @click="loadStories(topic.key, $event)>{{ topic.title }}</span>
  </div>
</div>
```

The result is like the screenshot below.

![Topic Navigation Bar](../../.vuepress/public/media/vhnews-tutorials-p2/nav_bar.png)

The `$event` param would be used to manipulate css class later. And, I must say, the Tailwind CSS framework is so powerful, especially in this kind of scenario, I don't need to hard code other css class, just use built in class utilities to decorate the elements.

Nest step, we need functions to make the user interface works, we gonna implement a method to load each topic when user click on. It's just a simple function to `dispatch` the `fetchItems` action from Vuex store with a param (we will modify it later). Also, we need a mechanism to highlight the active topic, by adding & removing a text color class from tailwind.

```javascript

methods: {
  loadStories(topic, evt) {
    this.$store.dispatch("fetchItems", topic);
    localStorage.topic = topic;
    document.querySelectorAll(".tab").forEach((elm) => {
      elm.classList.remove("text-green-500");
    });
    evt.target.classList.add("text-green-500");
  },
},
```

Now, for the Vuex Store action, we will rename function `loadLatestTopItems` in `store/index.js` to `fetchItems` and modify it as below:

```javascript

fetchItems(context, type = "top") {
  context.commit("clearItems");
  api
    .get(`${type}stories.json?limitToFirst=20&orderBy="$key"`)
    .then((res) => {
      res.data.forEach((id) => {
        api.get(`item/${id}.json?print=pretty`).then((res) => {
          context.commit("loadItems", res.data);
        });
      });
    })
    .catch((error) => {
      console.error(error);
    });
},
```

The new function take the type params (with default is `top`) and then pass directly to the API url endpoint by using the template literal feature of modern javascript. Now, run the command `yarn dev` and open `http://localhost:3000` to check if everything works. It should work properly, however the problem is when you load the page first time, the active topic is not highlight, we need a solution for this.

```javascript

created() {
  this.loadStories("top");
},
mounted() {
  this.$refs["topic-top"].classList.add("text-yellow-500");
},
```

The code is easy to understand, we load top stories by using the defined method `loadStories` when the component is `created` but at this stage of the Vue instance lifecycle, the DOM is not ready yet, so we need to put the next chunk of code to the `mounted` event, in order to highlight the top stories topic when the user load the page.

![Active Topic](../../.vuepress/public/media/vhnews-tutorials-p2/topic-highlight.png)

## Implement Dark Mode & localStorage

Okay, the interesting part, implement dark mode for our application. Fortunately, Tailwind have supported this feature out of the box. *"To make this as easy as possible, Tailwind includes a `dark` variant that lets you style your site differently when dark mode is enabled"*

Then, we are going to implement `dark` class to our applications. Firstly we make some fundamentals class in the `main.css` file in `src/assets/css`.

```css

/*! @import */
@tailwind base;
@layer base {
  html,
  body {
    @apply bg-gray-200 dark:bg-gray-900 dark:text-gray-300 h-full;
  }
  #app {
    @apply bg-gray-200 dark:bg-gray-900 h-full;
  }
  a {
    @apply text-blue-500 hover:text-pink-500 dark:text-pink-500 dark:hover:text-indigo-500;
  }
}
@tailwind components;
@tailwind utilities;
```

In this step, the color is totally up to your taste, the full source code is available on Github for your references. In order to save users' preferences, `localStorage` is an reasonable choice for a SPA app like this. From MDN, *"The read-only localStorage property allows you to access a Storage object for the Document's origin; the stored data is saved across browser sessions. localStorage is similar to sessionStorage, except that while data stored in localStorage has no expiration time"* The function `toggleDarkMode` below is written base on it. The function will accept a parameter to set the intended theme (which we can use when initializing the application) or toggle it.

```javascript

toggleDarkMode(theme, evt) {
  let htmlElm = document.querySelector("html");
  const setLight = () => {
    htmlElm.classList.remove("dark");
    localStorage.theme = "light";
    this.$refs.toggleDark.textContent = "☀️";
  };
  const setDark = () => {
    htmlElm.classList.add("dark");
    localStorage.theme = "dark";
    this.$refs.toggleDark.textContent = "🌙";
  };

  if (typeof theme === "string") {
    if (theme == "dark") setDark();
    else setLight();
  } else {
    if (localStorage.theme === "dark") setLight();
    else setDark();
  }
},
```

We inject an icon (I just use of the emoji for the quick design) for user to switch theme in the `template` section of the file `App.vue`

```html

<div class="theme-switch-wrapper">
  <span ref="toggleDark" class="h-6 w-6 flex items-center justify-center cursor-pointer bg-blue-500 dark:bg-green-500 rounded-full" @click="toggleDarkMode">☀️</span>
</div>
```

And check it out.

![Dark Mode Enabled](../../.vuepress/public/media/vhnews-tutorials-p2/darkmode.png)

Finally, we set up init variables when initializing the application, to load users' preferences.

```javascript

created() {
  if (!("topic" in localStorage)) localStorage.topic = "top";
  this.loadStories(localStorage.topic);
  if (!("theme" in localStorage)) localStorage.theme = "dark";
},
mounted() {
  this.toggleDarkMode(localStorage.theme);
  this.$refs[`topic-${localStorage.topic}`].classList.add("text-green-500");
},
```

The application will load the last topic, browsed by the user or the selected theme for the next session. The completed working code is pushed on the [Github repo](https://github.com/infantiablue/vhnews) and the live demo of [the HackerNews reader with Dark mode enabled](https://hnews.techika.com/) is still updated to the latest version.

## Conclusion

In summary, we've learned more basic implementations from the Vue 3 framework, dark mode support from Tailwind CSS, and usage of `localStorage` from Javascript. In the upcoming tutorials, we will go through more advanced concepts of Vue 3 such as plugins, mixin & composition API … Any feedback would be much appreciated.
