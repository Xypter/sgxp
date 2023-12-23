const themeSelect = document.getElementById("themeSelect");
const themeStylesheet = document.getElementById("themeStylesheet");

themeSelect.value = localStorage.theme

function setTheme(theme) {
  themeStylesheet.setAttribute("href","/themes/" + theme + ".css");
}

// this just needs to run once on pageload...
if (localStorage.theme) {
  setTheme(localStorage.theme);
  } else {
  setTheme("snow")
  themeSelect.value = "snow"
  }

themeSelect.addEventListener("change", function() {
  setTheme(this.value);
  localStorage.theme = this.value;
});
