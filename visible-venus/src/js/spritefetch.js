// Reusable Variables
const umamiKey = import.meta.env.PUBLIC_UMAMI_TOKEN;
const todaysDate = Date.now();
const localhost = "http://localhost:1337/api/sprites?populate=*"
let currentPage = 1;

// Now, currentPage is accessible outside the script
console.log(currentPage);

const apiUrl = `https://api.sgxp.me/api/sprites?populate=*&pagination[pageSize]=21`

// Sprite Card special number maker
function count(number) {
  if (number <= 9) {
    return '00' + number
  } else if (number > 9 && number <= 99) {
    return '0' + number
  } else {
    return number
  }
}

// Sprite Card size labeler for sprite sheets
function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// Sorter function
document.addEventListener('DOMContentLoaded', function () {
  const x = document.getElementsByClassName("custom-select");
  const l = x.length;

  for (let i = 0; i < l; i++) {
      const selElmnt = x[i].getElementsByTagName("select")[0];
      const ll = selElmnt.length;

      const a = document.createElement("DIV");
      a.setAttribute("class", "select-selected");
      a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
      x[i].appendChild(a);

      const b = document.createElement("DIV");
      b.setAttribute("class", "select-items select-hide");
      for (let j = 1; j < ll; j++) {
          const c = document.createElement("DIV");
          c.innerHTML = selElmnt.options[j].innerHTML;
          c.addEventListener("click", function(e) {
              const y = this.parentNode.parentNode.getElementsByTagName("select")[0];
              const sl = y.length;
              const h = this.parentNode.previousSibling;
              for (let k = 0; k < sl; k++) {
                  if (y.options[k].innerHTML == this.innerHTML) {
                      y.selectedIndex = k;
                      h.innerHTML = this.innerHTML;
                      const yy = this.parentNode.getElementsByClassName("same-as-selected");
                      const yl = yy.length;
                      for (let m = 0; m < yl; m++) {
                          yy[m].removeAttribute("class");
                      }
                      this.setAttribute("class", "same-as-selected");
                      this.setAttribute("value", selElmnt.options[selElmnt.selectedIndex].value);
                      break;
                  }
              }
              h.click();
          });
          b.appendChild(c);
      }
      x[i].appendChild(b);

      a.addEventListener("click", function(e) {
          e.stopPropagation();
          closeAllSelect(this);
          this.nextSibling.classList.toggle("select-hide");
          this.classList.toggle("select-arrow-active");
      });
  }

  function closeAllSelect(elmnt) {
      const x = document.getElementsByClassName("select-items");
      const y = document.getElementsByClassName("select-selected");
      const xl = x.length;
      const yl = y.length;
      const arrNo = [];
      for (let i = 0; i < yl; i++) {
          if (elmnt == y[i]) {
              arrNo.push(i);
          } else {
              y[i].classList.remove("select-arrow-active");
          }
      }
      for (let i = 0; i < xl; i++) {
          if (!arrNo.includes(i)) {
              x[i].classList.add("select-hide");
          }
      }
  }

  document.addEventListener("click", closeAllSelect);
});

// Sprite Card fetch request 
document.addEventListener('DOMContentLoaded', function () {
  const selectContainer = document.querySelector('.select-items');
  const div = document.getElementById('hello');
  const decrementButton = document.getElementById('decrementButton');
  const incrementButton = document.getElementById('incrementButton');
  const pageNumberElement = document.getElementById('pageNumber');

  let currentPage = parseInt(pageNumberElement.innerText, 10);
  let sortBy = ''; // Initialize sortBy outside the functions
  let isFetchingInProgress = false;
  let pageCount = 1; // Initialize pageCount

  // Attach click event listener to each option
  selectContainer.addEventListener('click', function (event) {
    if (event.target.tagName === 'DIV') {
      sortBy = event.target.getAttribute('value'); // Update sortBy value
      clearAndFetchSprites(sortBy);
    }
  });

  // Add click event listener to the decrement button
  decrementButton.addEventListener('click', function () {
    if (!isFetchingInProgress && currentPage > 1) {
      isFetchingInProgress = true;
      updatePageNumber(-1); // Decrease page number by 1
    }
  });

  // Add click event listener to the increment button
  incrementButton.addEventListener('click', function () {
    if (!isFetchingInProgress && currentPage < pageCount) {
      isFetchingInProgress = true;
      updatePageNumber(1); // Increase page number by 1
    }
  });

  // Function to update the page number
  function updatePageNumber(change) {
    // Clear existing data
    div.innerHTML = '';

    // Update the page number based on the change
    currentPage += change;

    // Ensure the page number is within the valid range
    currentPage = Math.min(Math.max(currentPage, 1), pageCount);

    // Update the page number element
    pageNumberElement.innerText = currentPage;

    // Disable the decrement button when on the first page
    decrementButton.disabled = currentPage === 1;

    // Fetch and sort sprites with the updated page number and the current sortBy
    fetchAndSortSprites(sortBy).finally(() => {
      isFetchingInProgress = false;
    });
  }

  function clearAndFetchSprites(newSortBy) {
    // Clear existing data
    div.innerHTML = '';

    // Reset the page number to 1 when a new sortBy is called
    currentPage = 1;
    pageNumberElement.innerText = currentPage;

    // Fetch new data with sorting based on the selected option
    return fetchAndSortSprites(newSortBy);
  }

  function fetchAndSortSprites(sortBy) {
    // Append sorting query parameter based on the selected option
    const urlWithSorting = sortBy ? `${apiUrl}&sort=${sortBy}&pagination[page]=${currentPage}` : `${apiUrl}&sort=createdAt:desc&pagination[page]=${currentPage}`;

    console.log(urlWithSorting);

    return fetch(urlWithSorting)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Network response was not ok: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        // Extract pageCount from the API response
        pageCount = data.meta.pagination.pageCount;

        const spritePromises = data.data.map(sprite => {
          return fetch(`https://analytics.sgxp.me/api/websites/c78c6fb7-bd5f-4715-8af5-f794ad7b3584/stats?startAt=1672578061000&endAt=${todaysDate}&url=/sprites/${sprite.id}`, {
            headers: { Authorization: `Bearer ${umamiKey}` }
          })
            .then(res => res.json())
            .then(data => {
              let views = data.pageviews.value;

              // Assume the following functions return dynamically fed values
              const countValue = count(sprite.id);
              const titleValue = sprite.attributes.title;
              const iconImageUrl = `https://api.sgxp.me${sprite.attributes.iconimage.data.attributes.url}`;
              const authorName = sprite.attributes.author.data.attributes.name;
              const gameName = sprite.attributes.game.data.attributes.name;
              const createdByUsername = sprite.attributes.createdBy.username;
              const sizeValue = formatBytes(sprite.attributes.spritesheet.data.attributes.size * 1000, 2);

              return `
              <a href="/sprites/${sprite.id}" class="sprite-box" target="_blank">
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
                <div class="sprite-number">${countValue}</div>
                <div class="sprite-title">
                  <div id="author" class="sprite-text">${titleValue}</div>
                </div>
                <div class="sprite-image">
                  <img src="${iconImageUrl}" alt="">
                </div>
                <div class="sprite-author">
                  <div class="sprite-text">${authorName}</div>
                </div>
                <div class="sprite-stats">
                  <div class="sprite-text">${gameName}</div>
                </div>
                <div class="sprite-stats">
                  <div class="sprite-text">${createdByUsername}</div>
                </div>
                <div class="sprite-stats">
                  <div class="sprite-text">${views}</div>
                </div>
                <div class="sprite-stats">
                  <div class="sprite-text">${sizeValue}</div>
                </div>
              </a>
              `;
            });
        });

        // Use Promise.all to wait for all fetches to complete
        return Promise.all(spritePromises)
          .then(spriteHtmlArray => {
            // Combine the HTML strings and append to the div
            div.innerHTML += spriteHtmlArray.join('');
          })
          .catch(error => {
            console.error('Error fetching sprite data:', error);
          });
      });
  }

  // Fetch and display sprites on page load with default sorting
  fetchAndSortSprites(sortBy).finally(() => {
    isFetchingInProgress = false;
    // Disable the decrement button when on the first page
    decrementButton.disabled = currentPage === 1;
    // Disable the increment button when on the last page
    incrementButton.disabled = currentPage === pageCount;
  });
});



// Old code kept in case I need it >:]


// Depricated 01/25/2024
// function getSprites() {
//   const div = document.getElementById('hello')
//   fetch(apiUrl)
//   .then(res => res.json())
//   .then(data => {
//     data.data.forEach(sprite => {
//       fetch(`https://analytics.sgxp.me/api/websites/c78c6fb7-bd5f-4715-8af5-f794ad7b3584/stats?startAt=1672578061000&endAt=${todaysDate}&url=/sprites/${sprite.id}`, {
//         headers: {Authorization: `Bearer ${umamiKey}`}
//       })
//       .then(res => res.json())
//       .then(data => {
//         let views = data.pageviews.value

//         div.innerHTML += `

//         <a href="/sprites/${sprite.id}" class="sprite-box">
//           <div class="sprite-star-container">
//             <div class="sprite-star"></div>
//             <div class="sprite-star"></div>
//             <div class="sprite-star"></div>
//             <div class="sprite-star"></div>
//             <div class="sprite-star"></div>
//             <div class="sprite-star"></div>
//             <div class="sprite-star"></div>
//             <div class="sprite-star"></div>
//             <div class="sprite-star"></div>
//             <div class="sprite-star"></div>
//           </div>
//           <div class="sprite-number">${count(sprite.id)}</div>
//           <div class="sprite-title">
//             <div id="author" class="sprite-text">${sprite.attributes.title}</div>
//           </div>
//           <div class="sprite-image">
//             <img src="https://api.sgxp.me${sprite.attributes.iconimage.data.attributes.url}" alt="">
//           </div>
//           <div class="sprite-author">
//             <div class="sprite-text">${sprite.attributes.author.data.attributes.name}</div>
//           </div>
//           <div class="sprite-stats">
//             <div class="sprite-text">${sprite.attributes.game.data.attributes.name}</div>
//           </div>
//           <div class="sprite-stats">
//             <div class="sprite-text">${sprite.attributes.createdBy.username}</div>
//           </div>
//           <div class="sprite-stats">
//             <div class="sprite-text">${views}</div>
//           </div>
//           <div class="sprite-stats">
//             <div class="sprite-text">${formatBytes(sprite.attributes.spritesheet.data.attributes.size*1000, 2)}</div>
//           </div>
//         </a>

//             `
//       })
      
//     })
//   })
// }

// getSprites();


// Depricated 01/29/2024
// function getSprites() {
//   const div = document.getElementById('hello');
//   fetch(apiUrl)
//       .then(res => res.json())
//       .then(data => {
//           const spritePromises = data.data.map(sprite => {
//               return fetch(`https://analytics.sgxp.me/api/websites/c78c6fb7-bd5f-4715-8af5-f794ad7b3584/stats?startAt=1672578061000&endAt=${todaysDate}&url=/sprites/${sprite.id}`, {
//                   headers: { Authorization: `Bearer ${umamiKey}` }
//               })
//                   .then(res => res.json())
//                   .then(data => {
//                       let views = data.pageviews.value;

//                       return `
//                       <a href="/sprites/${sprite.id}" class="sprite-box">
//                       <div class="sprite-star-container">
//                         <div class="sprite-star"></div>
//                         <div class="sprite-star"></div>
//                         <div class="sprite-star"></div>
//                         <div class="sprite-star"></div>
//                         <div class="sprite-star"></div>
//                         <div class="sprite-star"></div>
//                         <div class="sprite-star"></div>
//                         <div class="sprite-star"></div>
//                         <div class="sprite-star"></div>
//                         <div class="sprite-star"></div>
//                       </div>
//                       <div class="sprite-number">${count(sprite.id)}</div>
//                       <div class="sprite-title">
//                         <div id="author" class="sprite-text">${sprite.attributes.title}</div>
//                       </div>
//                       <div class="sprite-image">
//                         <img src="https://api.sgxp.me${sprite.attributes.iconimage.data.attributes.url}" alt="">
//                       </div>
//                       <div class="sprite-author">
//                         <div class="sprite-text">${sprite.attributes.author.data.attributes.name}</div>
//                       </div>
//                       <div class="sprite-stats">
//                         <div class="sprite-text">${sprite.attributes.game.data.attributes.name}</div>
//                       </div>
//                       <div class="sprite-stats">
//                         <div class="sprite-text">${sprite.attributes.createdBy.username}</div>
//                       </div>
//                       <div class="sprite-stats">
//                         <div class="sprite-text">${views}</div>
//                       </div>
//                       <div class="sprite-stats">
//                         <div class="sprite-text">${formatBytes(sprite.attributes.spritesheet.data.attributes.size*1000, 2)}</div>
//                       </div>
//                     </a>
//                       `;
//                   });
//           });

//           // Use Promise.all to wait for all fetches to complete
//           Promise.all(spritePromises)
//               .then(spriteHtmlArray => {
//                   // Combine the HTML strings and append to the div
//                   div.innerHTML += spriteHtmlArray.join('');
//               })
//               .catch(error => {
//                   console.error('Error fetching sprite data:', error);
//               });
//       });
// }



