var canvas = document.getElementById('canvas');
// we need this to load the font
var myFont = new FontFace('myFont', 'url(/src/styles/fonts/PixelTiny.ttf)');

myFont.load().then(function(font){

  // with canvas, if this is ommited won't work
  document.fonts.add(font);

  console.log('Font loaded');

   // set width and height as screen w and h
  canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	console.log(canvas);

  // get canvas context
	var ctx = canvas.getContext("2d");
	ctx.font = "16px myFont"; // set font
	ctx.textAlign = "center"; // center text
	ctx.fillText("Hello, World!", canvas.width/2, canvas.height/2); // draw centered text
});	

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

function getSprites() {
    const div = document.getElementById('hello')
    fetch('https://api.sgxp.me/api/sprites?[populate]=*')
    .then(res => res.json())
    .then(data => {
      data.data.forEach(sprite => {
        div.innerHTML += `

    <a href="${sprite.id}" class="sprite-box">
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
