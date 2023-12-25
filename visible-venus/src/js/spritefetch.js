function getSprites() {
    const div = document.getElementById('hello')
    fetch('http://localhost:1337/api/posts?populate=*')
    .then(res => res.json())
    .then(data => {
      data.data.forEach(sprite => {
        div.innerHTML += `

    <a href="#" onclick="flipSlide()" class="sprite-box">
      <div class="sprite-star-container">
        <div class="sprite-star"></div>
        <div class="sprite-star"></div>
        <div class="sprite-star"></div>
        <div class="sprite-star"></div>
        <div class="sprite-star"></div>
        <div class="sprite-star"></div>
        <div class="sprite-star"></div>
        <div class="sprite-star"></div>
        <div class="sprite-star"></div>
        <div class="sprite-star"></div>
      </div>
      <div class="sprite-number">
        <div class="sprite-number-text">00${sprite.id}</div>
      </div>
      <div class="sprite-title">
        <div id="author" class="sprite-text">${sprite.attributes.title}</div>
      </div>
      <div class="sprite-image">
        <img src="/my-project/public/${sprite.attributes.iconimage.data.attributes.url}" alt="">
      </div>
      <div class="sprite-author">
        <div class="sprite-text">${sprite.attributes.author}</div>
      </div>
      <div class="sprite-stats">
        <div class="sprite-text">Customs</div>
      </div>
      <div class="sprite-stats">
        <div class="sprite-text">${sprite.attributes.submitter}</div>
      </div>
      <div class="sprite-stats">
        <div class="sprite-text"></div>
      </div>
      <div class="sprite-stats">
        <div class="sprite-text">${sprite.attributes.sheet.data.attributes.size}KB</div>
      </div>
    </a>

        `
      })
    })
  }

console.log(getSprites())
