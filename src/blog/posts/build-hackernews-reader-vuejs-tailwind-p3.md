---
title: Build the HackerNews Reader with VueJS 3 — Part 3, infinite loading with ES2018 syntax
description: Step by step, with detailed explanations, to build the HackerNews Reader using Vue 3, Vite 2, VueX 4 & Tailwind, with the implementation of infinite loading by using ES2018 syntax
author: Truong Phan
type: article
image: https://storage.googleapis.com/techika-media/images/hnews-part3/banner.jpg
date: 2021-05-29
tags:
  - tutorial
  - vuejs
  - taildwind
  - vite
  - es2018
  - api
---
## Objectives

Continue from previous parts [[1](https://techika.com/2021/01/09/build-hackernews-reader-vuejs-tailwind-p1/)][[2](https://techika.com/2021/01/16/build-hackernews-reader-vuejs-tailwind-p2/)] in this part, we will go through a few advanced techniques to implement infinite loading feature to get more posts from HackerNews and skeleton gradient animation to deliver the best user experience. Although there are Vue Plugins to support infinite loading, in this tutorial, we will build from scratch so that we could learn deeply through the progress. Finally, due to the limitation of HackerNews API, we have a chance to use the new feature of ES2018 `await for of`

![https://storage.googleapis.com/techika-media/images/hnews-part3/screencast.gif](https://storage.googleapis.com/techika-media/images/hnews-part3/screencast.gif)

## API Analysis

Firstly, we need to analyze the API from HackerNews to draft a basic design to implement infinite loading. From the official document, HackerNews API is built on top of Firebase, and we can only up to 500 recent items, and the result is a list of IDs below.

```jsx
// 20210529073748
// https://hacker-news.firebaseio.com/v0/topstories.json?limitToFirst=10&orderBy=%22$key%22

[
  27317655,
  27321754,
  27321780,
  27288079,
  27319540,
  27316115,
  27321387,
  27301260,
  27301651,
  27301210
]
```

Hence, in order to paginate items, we may `slice` as below:

```jsx
// Query next 10 items for page 2
let resp = await api.get(`topstories.json?limitToFirst=20&orderBy="$key"`);
let result = resp.data.slice(10, 20);
```

## Design

Next step, we design the functions to handle data from API and then render it when the user scrolls to load. From the previous tutorials, we just load all of them at once, so this isn't gonna be a problem. However, when we gonna implement the infinite loading feature, this could cause an issue.
Let's examine, firstly, how to load items infinitely. We will use the event `scroll` like this:

```javascript
window.onscroll = () => {
 window.innerHeight + window.scrollY >= document.body.offsetHeight && this.handleScroll();
};
```

Basically, the chuk of code above will listen on the event `scroll` and whenever the user reaches the bottom of the page, the function `handleScroll` would be invoked to render new items. However, in production, we need to make a lot of queries due to the limitation of 3rd party API.

```javascript
[
  27317655, // 1st request -> https://hacker-news.firebaseio.com/v0/item/27317655.json
  27321754, 
  27321780,
  27288079,
  27319540,
  27316115,
  27321387,
  27301260,
  27301651,
  27301210 // 10th request -> https://hacker-news.firebaseio.com/v0/item/27301210.json
]
```

All of these activities are asynchronous, handling by mechanism from `Promise` object. So, even all of these items are not resolved, the event `scroll` still being listened and keep invoking `handleScroll` function.

To sum up, there are technical requirements to implement:  

1. A flag to prevent `handleScroll` to be invoked when API result still not be resolved yet
2. A flag to stop `scroll` event to be listened,  when no more items loaded from API
3. Handling pagination across topics
4. A mechanism to handle all multiple asynchronous requests at once.

## Implementation

To deal with the first task, a `boolean` variable `loading` would be created in a global state, so that we could tracking when the request is initialized to turn it on and set it off when all data is settled. We also create another `boolean` variable `endPagination` to track if there are no more items to load for a particular topic. Finally, an `int` variable `page` to manipulate pagination. Then our global state configuration would be like this.

```jsx
state: {
  topic: "top",
  loading: false,
  page: 1,
  items: [],
  endPagination: false,
 },
 mutations: {
  setTopic(state, topic) {
   state.topic = topic;
  },
  setLoading(state, status) {
   state.loading = status;
  },
  setEndPagination(state, status) {
   state.endPagination = status;
  },
  setPage(state, page) {
   state.page = page;
  },
  increasePage(state) {
   state.page++;
  },
  loadItems(state, items) {
   state.items = [...state.items, ...items];
  },
  clearItems(state) {
   state.items = [];
  },
 },

```

Next, we gonna handle API requests. There are a few ways to process multiple asynchronous requests such as using `Promise.all()`, still, I would like to introduce you to how to make use of a new and very useful feature of ES2018: [asynchronous iteration](https://github.com/tc39/proposal-async-iteration) `for await ... of`

As this syntax is fairly new, so we need `babel` to make it works on browsers.

Firstly, install a few plugins and `@babel/core`

```bash
yarn add -D @babel/core @rollup/plugin-babel @babel/plugin-proposal-async-generator-functions
```

Create new file `.babelrc`

```bash
{
  "plugins": ["@babel/plugin-proposal-async-generator-functions"]
}
```

Then modify `vite.config.js`

```jsx
import vue from "@vitejs/plugin-vue";
import { babel } from "@rollup/plugin-babel";
/**
 * @type {import('vite').UserConfig}
 */
export default {
 plugins: [vue(), babel({ babelHelpers: "bundled" })],
};
```

You can read more about the babel transform plugin [here](https://babeljs.io/docs/en/babel-plugin-proposal-async-generator-functions). Then, we are good to go.

In order to implement this feature, we gonna write an *async function generator.*

```jsx
async function* asyncGetter(data) {
 let i = 0;
 while (i < data.length) {
  let res = await api.get(`item/${data[i]}.json?print=pretty`);
  i++;
  yield res.data;
 }
}
```

The above async function will generate values, which conform to the async iterable protocol, then they can be looped using `for await ... of` The mechanism is crucial, to synchronize requesting activities so that we can handle the event `on` as I mentioned from the beginning. Here is the complete code at `store\index.js`

## Skeleton Loading

Skeleton loading is not new and is widely adopted, to enhance the user experience when loading more content. It's not difficult to apply it to our project. So that, I just briefly write up about how it works, the code is already in the Github repo.

All we need to do is to create another Vue Component with the required CSS to style and animate the background. The trick is we need to set how the number of skeleton posts, conformed with the pagination system. To achieve that goal, we write a concise functio to generate a list of number to be used with `v-for`

```jsx
range(start, end) {
  return Array.apply(0, Array(end - 1)).map((element, index) => index + start);
},
```

You can check out the complete code of `components\Skeleton.vue` in the repo

## Bonus

There is another new component `components\Modal.vue` to create modal effect for text posts such as *Ask*. This component is used a new Vue 3 API, [teleport](https://v3.vuejs.org/guide/teleport.html) .  I will leave it for your own exploration. It's quite easy to follow.

## Conclusion

In this part, I think the most important lesson is how we analysis, plan and implement desired features. By planning ahead, we gonna avoid many bugs and save a lot of time in implementation stage. More than that, we also have a chance to get familiar with ES2018 syntax `for await ... of` in a practical project.

<sub>Photo by <a href="https://unsplash.com/@angelyviviana55?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Angely Acevedo</a> on <a href="https://unsplash.com/s/photos/infinite?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a></sub>
  