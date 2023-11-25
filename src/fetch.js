function getSprites() {
fetch('http://localhost:1337/api/sprites')
    .then(res => res.json())
    .then(data => {
        console.log(data)
    })
}