const umamiKey = import.meta.env.PUBLIC_UMAMI_TOKEN;
const todaysDate = Date.now();
const localhost = "http://localhost:1337/api/sprites?populate=*"
const apiUrl = "https://api.sgxp.me/api/sprites?[populate]=*"

function count(number) {
  if (number <= 9) {
    return '00' + number
  } else if (number > 9 && number <= 99) {
    return '0' + number
  } else {
    return number
  }
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}


// function getStats() {
//   fetch(`https://analytics.sgxp.me/api/websites/c78c6fb7-bd5f-4715-8af5-f794ad7b3584/stats?startAt=1672578061000&endAt=${todaysDate}&url=/sprites`, {
//   headers: {Authorization: `Bearer ${umamiKey}`}
// })
//    .then(res => res.json())
//    .then(data => console.log(data.pageviews.value))
// }

// getStats()


function getSprites() {
  fetch(`https://analytics.sgxp.me/api/websites/c78c6fb7-bd5f-4715-8af5-f794ad7b3584/stats?startAt=1672578061000&endAt=${todaysDate}&url=/sprites`, {
    headers: {Authorization: `Bearer ${umamiKey}`}
  })
  .then(res => res.json())
  .then(data => {
    let views = data.pageviews.value
  })

    const div = document.getElementById('hello')
    fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      data.data.forEach(sprite => {
        fetch(`https://analytics.sgxp.me/api/websites/c78c6fb7-bd5f-4715-8af5-f794ad7b3584/stats?startAt=1672578061000&endAt=${todaysDate}&url=/sprites/${sprite.id}`, {
    headers: {Authorization: `Bearer ${umamiKey}`}
  })
  .then(res => res.json())
  .then(data => {
    let views = data.pageviews.value

    div.innerHTML += `

    <a href="/sprites/${sprite.id}" class="sprite-box">
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
      <div class="sprite-number">${count(sprite.id)}</div>
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
        <div class="sprite-text">${views}</div>
      </div>
      <div class="sprite-stats">
        <div class="sprite-text">${formatBytes(sprite.attributes.spritesheet.data.attributes.size, 2)}</div>
      </div>
    </a>

        `
  })
        
      })
    })
  }

getSprites();
