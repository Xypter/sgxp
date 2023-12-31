function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

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
        <div class="sprite-text">${formatBytes(sprite.attributes.spritesheet.data.attributes.size, 2)}</div>
      </div>
    </a>

        `
      })
    })
  }

getSprites();
