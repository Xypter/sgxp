import { format, parseISO } from "date-fns";

function getSprites() {

                
    `function random() {
      const result = format(parseISO(post.attributes.publishedAt), 'eeee do MMM, yyyy')
      return result;
    };

    random()`

    



    const div = document.getElementById('posts')
    fetch('https://api.sgxp.me/api/posts?populate=*')
    .then(res => res.json())
    .then(data => {
      data.data.forEach(post => {
        div.innerHTML += `

        <div class="main-content-title">${post.attributes.title}</div>
        <div class="main-content-box">
          <div class="news">
            <div class="news-img"><img src="https://api.sgxp.me${post.attributes.avatar.data.attributes.url}" alt=""></div>
            <div class="news-user">${post.attributes.createdBy.username}</div>
            <div class="news-date">${format(parseISO(post.attributes.publishedAt), "LLLL do yyyy 'at' h:m aa")}</div>
            <div class="news-content">
            ${post.attributes.content[0].children[0].text}
            </div>
          </div>
        </div>

        `
      })
    })
  }

getSprites();
