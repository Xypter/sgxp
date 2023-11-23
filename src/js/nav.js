const themeSelect = document.getElementById("themeSelect");
const themeStylesheet = document.getElementById("themeStylesheet");

themeSelect.value = localStorage.theme

function setTheme(theme) {
  themeStylesheet.setAttribute("href","css/themes/" + theme + ".css");
}

// this just needs to run once on pageload...
if (localStorage.theme) {
  setTheme(localStorage.theme);
  } else {
  setTheme("style_v7")
  themeSelect.value = "style_v7"
  }

themeSelect.addEventListener("change", function() {
  setTheme(this.value);
  localStorage.theme = this.value;
});
