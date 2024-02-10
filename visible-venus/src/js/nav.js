// Function to set the theme
function setTheme(theme) {
  themeStylesheet.setAttribute("href", "/themes/" + theme + ".css");
  // Save the selected theme to local storage
  localStorage.setItem("theme", theme);
}

// Function to get the saved theme from local storage
function getSavedTheme() {
  return localStorage.getItem("theme") || "snow"; // Default theme is "snow"
}

const themeSelects = document.getElementsByClassName("theme-select");

// Loop through each theme select
for (let i = 0; i < themeSelects.length; i++) {
  const selElmnt = themeSelects[i].getElementsByTagName("select")[0];

  const themeSelected = document.createElement("DIV");
  themeSelected.setAttribute("class", "theme-selected");
  themeSelected.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
  themeSelects[i].appendChild(themeSelected);

  const themeItems = document.createElement("DIV");
  themeItems.setAttribute("class", "theme-items theme-hide");

  // Loop through each option in the select
  for (let j = 1; j < selElmnt.length; j++) {
    const themeItem = document.createElement("DIV");
    themeItem.innerHTML = selElmnt.options[j].innerHTML;
    themeItem.addEventListener("click", function (e) {
      const y = this.parentNode.parentNode.getElementsByTagName("select")[0];
      const h = this.parentNode.previousSibling;

      for (let k = 0; k < y.length; k++) {
        if (y.options[k].innerHTML == this.innerHTML) {
          y.selectedIndex = k;
          h.innerHTML = this.innerHTML;

          const selectedItems = this.parentNode.getElementsByClassName("theme-as-selected");
          for (let m = 0; m < selectedItems.length; m++) {
            selectedItems[m].removeAttribute("class");
          }
          this.setAttribute("class", "theme-as-selected");
          break;
        }
      }
      h.click();
      // Call the setTheme function when a theme is selected
      const selectedTheme = y.value;
      setTheme(selectedTheme);
    });
    themeItems.appendChild(themeItem);
  }

  themeSelects[i].appendChild(themeItems);

  themeSelected.addEventListener("click", function (e) {
    e.stopPropagation();
    closeAllSelect(this);
    this.nextSibling.classList.toggle("theme-hide");
    this.classList.toggle("theme-arrow-active");
  });
}

function closeAllSelect(elmnt) {
  const themeItems = document.getElementsByClassName("theme-items");
  const themeSelected = document.getElementsByClassName("theme-selected");
  for (let i = 0; i < themeSelected.length; i++) {
    if (elmnt == themeSelected[i]) {
      continue;
    }
    themeSelected[i].classList.remove("theme-arrow-active");
  }
  for (let i = 0; i < themeItems.length; i++) {
    if (elmnt == themeSelected[i]) {
      continue;
    }
    themeItems[i].classList.add("theme-hide");
  }
}

document.addEventListener("click", closeAllSelect);

// Set the initial theme based on local storage
const savedTheme = getSavedTheme();
setTheme(savedTheme);
