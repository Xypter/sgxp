function getSprites() {
    const div = document.getElementById('hello')
    fetch('https://api.sgxp.me/api/sprites?[populate]=*')
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
        <img src="https://api.sgxp.me${sprite.attributes.iconimage.data.attributes.url}" alt="">
      </div>
      <div class="sprite-author">
        <div class="sprite-text">${sprite.attributes.author.data.attributes.name}</div>
      </div>
      <div class="sprite-stats">
        <div class="sprite-text">Customs</div>
      </div>
      <div class="sprite-stats">
        <div class="sprite-text">${sprite.attributes.createdBy.username}</div>
      </div>
      <div class="sprite-stats">
        <div class="sprite-text"></div>
      </div>
      <div class="sprite-stats">
        <div class="sprite-text">${sprite.attributes.spritesheet.data.attributes.size}KB</div>
      </div>
    </a>

        `
      })
    })
  }

getSprites();
