---
title: My Projects
---

# [Expensify](https://github.com/infantiablue/expensify) <Badge text="Open Source" vertical="middle"/>

The main idea of the project is to build a personal expense/income tracker. It's pretty straight forward with some core functions:

- Add expense/income transaction
- Remove transaction (AJAX)
- Create category for transactions
- Remove category (AJAX)
- The user can see transactions per category
- The user can check balance, total income, total expense at a glance
- The user can view all transactions with infinite loading implementation
- The user can update personal information and change avatar
- There are pretty charts to review past transactions
- Mobile friendly

Built on Django, and [Vanilla Javascript Framework](http://vanilla-js.com/)

<iframe width="100%" height="315" src="https://www.youtube.com/embed/m-gytkEDR8g" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
<br/><br/>

---

# [Convertca](https://convertca.com) <Badge text="Open Source" vertical="middle"/>

I was learning Web Dev and believe the best way is to practice. Then I made this project with some technology which could be over-engineeredfor such a simple site, but I can learn a lot from that. The site basically let you convert any youtube video less than 10 mins to MP3/ACC files, save it to DropBox, basic profile with history. It has been published on [Reddit](https://www.reddit.com/r/Python/comments/k003t6/a_complete_web_app_to_convert_youtube_videos_to/) community.

Here are some tech tools have been used:

- Flask, SQLAlchemy, Flask-Dance
- Google Cloud Logging
- Custom Web Socket Server for progess bar
- VueJS, WebPack, Bootstrap for front end
- PostgreSQL
- PyTest
- Social Authentication
- Experiment with Google Cloud Firestore, which you can find in web/gdata folder
- Supervisor, gunicorn with Nginx for production
  
<br/><br/>
🎁 [Github Repo](https://github.com/infantiablue/converter)
<br/><br/>

---

# [HackerNews Reader](https://hnews.techika.com/) <Badge text="Open Source" vertical="middle"/> <Badge text="WIP" type="warning" vertical="middle"/>

![Demo](assets/img/darkmode.ebc0d14f.png)

The project has been developed to experiment with Vue 3 and Vite. To make it simple for the learning purpose, the goal is just to receive the top articles from Hacker News and load it from the client side. It has been published on [Medium](https://infantiablue.medium.com/hackernews-reader-with-vue-3-vite-2-and-vuex-4-part-1-247315ceb06a) as tutorials.
<br/><br/>
🎁 [Github Repo](https://github.com/infantiablue/vhnews)

<style scoped>
h2{
  border-bottom:none;
}
li{
  list-style-type: none;
}
li::before {
  content: "✅ ";
}
</style>
