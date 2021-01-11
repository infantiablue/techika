---
title: Build the HackerNews Reader with VueJS 3 — Part 1
description: Step by step to build the HackerNews Reader using, Vue 3, Vite 2, VueX 4 & Tailwind
author: Truong Phan
type: article
cover: https://dev-to-uploads.s3.amazonaws.com/i/xfnecytgg7kp0uxmm7f4.png
tags:
  - vuepress
  - vuejs
  - taildwind
  - vite
  - vuex
---

VueJS is raising as one of the most popular front end framework, compared with React (supported by Facebook) and Angular (from Google). Recently, it has been updated to version 3 with many new exciting features. In this post, we will explore the combination with VueX (state management) to handle 3rd party API. To make it simple for the learning purpose, our goal is just to receive the top articles from Hacker News and load it from the client side.

> You can try the online [demo](https://vhnews.netlify.app/)

First of all we use Vite to scaffold the project. You may wonder why I don’t use the official Vue CLI tool. The reason is Vite is really fast, and in this case I just want to make a quick demonstration. Vue CLI, in other hand, is built on top of the powerful and popular Webpack , will bring you an amazing plugin ecosystem (and it’s compatible with Vue 2). So, now we use yarn (you can use npm instead, just a personal favor, although I prefer the speed of yarn) to create our new web app (requires Node.js version >=12.0.0.)

```bash
yarn create @vitejs/app
```

After enter the command, you will be prompted to choose some selections. Then we cd to your working directory and run following commands to install some tools: VueX (version 4.x), eslint as well as its plugin for Vue and axios.

```bash
yarn
yarn add axios vuex@next --save
yarn add -D eslint eslint-plugin-vue
yarn eslint --init
yarn dev
```

Now, you can open the browser and go to the address `http://localhost:3000` to see if the dev server is running.

![The dev server is running at localhost:3000](https://dev-to-uploads.s3.amazonaws.com/i/zxcn7lzvohswey2pg81q.jpeg)

For the interface, I gonna use Tailwind, and “Vue 3 and Vite don’t support PostCSS 8 yet so you need to install the Tailwind CSS v2.0 PostCSS 7”.

```bash
yarn add -D tailwindcss@npm:@tailwindcss/postcss7-compat @tailwindcss/postcss7-compat postcss@^7 autoprefixer@^9
```

Next, to generate the tailwind.config.js and postcss.config.js files, run:

```bash
npx tailwindcss init -p
```

From the official guide: “In your tailwind.config.js file, configure the purge option with the paths to all of your pages and components so Tailwind can tree-shake unused styles in production builds.”

```javascript
module.exports = {
    purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    darkMode: false, // or 'media' or 'class'
    theme: {
      extend: {},
    },
    variants: {
      extend: {},
    },
    plugins: [],
}
```

Then create a new file `main.css` in `src/assets/css`:

```css
/* ./src/assets/css/main.css */

/*! @import */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Then, we need to fetch the data from HackerNews to VueX store first. In the snippet below, I also set up the axios instance, so that we can re-use it later. The API from HackerNews to get top stories only return the IDs, so that we need to fetch each individual item after receiving the arrays.

{% gist https://gist.github.com/infantiablue/56d0f3906629b479db8d31e6cb84a230 file=index.js %}

Next, we create a new component at `components/Stories.vue` as below:

{% gist https://gist.github.com/infantiablue/38249ba7e2d66b459c0867167645b76f file=Stories.vue %}

Then add VueX to the main.js

```javascript
import { createApp } from "vue";
import App from "./App.vue";
import store from "./store";
import "./assets/css/main.css";
const app = createApp(App);
app.use(store);
app.mount("#app");
```

Finally, we edit `App.vue`

{% gist https://gist.github.com/infantiablue/2f34fcedc8078d1c79833a09731e3cd2 file=App.vue %}

Open the `http://localhost:3000` and voilà.

![Top stories from Hacker News(https://dev-to-uploads.s3.amazonaws.com/i/hvhu4g5gnpfii0os2xwk.png)

Hmm, I forgot the time, we need to make it more readable, instead of a string of numbers. I gonna use the `timeago.jspackage` to manipulate.

```bash
yarn add timeago.js
```

Then, we add a new method in `components/Stories.vue`:

```javascript
methods: {
  parseTime(t) {
    return timeago.format(t * 1000);
  }
},
```

and implement it in template section:

```html
<div class="text-sm text-gray-500">{{ parseTime(item.time) }}</div>
```

Reload the page to check the result

![The time is readable](https://dev-to-uploads.s3.amazonaws.com/i/8hprv3fgzjvq24gjufp7.png)

The final source code is on [Github repo](https://github.com/infantiablue/vhnews).
In the next article, we will implement advanced features of Vue components to render them dynamically. I would appreciate to receive any feedback from you guys

Resources:

* [Vite.JS](https://vitejs.dev/)
* [Vuex@Next](https://next.vuex.vuejs.org/)
* [Official Hacker News API](https://github.com/HackerNews/API)
* [Tailwind CSS](https://tailwindcss.com/)

*The post is also published on [Medium](https://infantiablue.medium.com/hackernews-reader-with-vue-3-vite-2-and-vuex-4-part-1-247315ceb06a).*
