// Reusable Variables

const apiKey = import.meta.env.PUBLIC_API_KEY; // Add your API key here

const todaysDate = Date.now();

const localhost = "http://localhost:3000/api/sprites?depth=3&draft=false&locale=undefined&trash=false"

let currentPage = 1;

const apiUrl = `https://cms.sgxp.me/api/sprites?depth=3&draft=false&locale=undefined&trash=false&limit=21`

// Import character maps from a separate file
import { charMap, altNumberMap } from './charMap.js';

// Helper function to create individual character sprite
function createCharacterSprite(char, characterMap, isAltNumberMap) {
  if (characterMap[char]) {
    const charData = characterMap[char];
    const width = charData.width;
    const height = charData.height;
    const offsetX = charData.offsetX || 0;
    const offsetY = charData.offsetY || 0;
    
    const marginRight = isAltNumberMap ? '0px' : '1px';
    
    let spriteStyle = `
      display: inline-block;
      width: ${width}px;
      height: ${height}px;
      background-image: url('https://i.imgur.com/DFC6vib.png');
      background-size: 400px 14px;
      background-position: ${charData.x}px ${charData.y}px;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      margin-right: ${marginRight};
      position: relative;
      left: ${offsetX}px;
      top: ${offsetY}px;
    `;
    
    return `<span style="${spriteStyle.replace(/\s+/g, ' ').trim()}"></span>`;
  } else {
    // Character not found, add a placeholder
    return `<span style="
      display: inline-block;
      width: 4px;
      height: 5px;
      background-color: #ff0000;
      opacity: 0.3;
      margin-right: 1px;
      position: relative;
    " title="Unknown character: ${char}"></span>`;
  }
}

// Original function without word wrapping (for backward compatibility)
function textToSpriteHTMLOriginal(input, characterMap, isAltNumberMap) {
  let html = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if (char === '\n') {
      html += '<div class="sprite-newline" style="display: block; height: 7px; width: 100%;"></div>';
    } else {
      html += createCharacterSprite(char, characterMap, isAltNumberMap);
    }
  }
  
  return html;
}

// Function to convert text to sprite HTML with word wrapping
function textToSpriteHTML(text, characterMap, maxWidth = null) {
  const input = text.toString().toUpperCase();
  let html = '';
  
  // Check if we're using the altNumberMap
  const isAltNumberMap = characterMap === altNumberMap;
  
  // If no maxWidth specified, use original behavior
  if (!maxWidth) {
    return textToSpriteHTMLOriginal(input, characterMap, isAltNumberMap);
  }
  
  // Split text into words
  const words = input.split(' ');
  let currentLineWidth = 0;
  
  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    
    // Calculate word width
    let wordWidth = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (characterMap[char]) {
        wordWidth += characterMap[char].width;
        if (!isAltNumberMap && i < word.length - 1) {
          wordWidth += 1; // Add margin-right spacing
        }
      } else {
        wordWidth += 4; // Unknown character width
        if (i < word.length - 1) {
          wordWidth += 1; // Add margin-right spacing
        }
      }
    }
    
    // Add space width if not the first word on the line
    let spaceWidth = 0;
    if (currentLineWidth > 0) {
      spaceWidth = characterMap[' '] ? characterMap[' '].width : 3;
      if (!isAltNumberMap) {
        spaceWidth += 1; // Add margin-right spacing
      }
    }
    
    // Check if word fits on current line
    if (currentLineWidth > 0 && currentLineWidth + spaceWidth + wordWidth > maxWidth) {
      // Word doesn't fit, start new line
      html += '<div class="sprite-newline" style="display: block; width: 100%;"></div>';
      currentLineWidth = 0;
    }
    
    // Add space if not at beginning of line
    if (currentLineWidth > 0) {
      html += createCharacterSprite(' ', characterMap, isAltNumberMap);
      currentLineWidth += spaceWidth;
    }
    
    // Add word characters
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      html += createCharacterSprite(char, characterMap, isAltNumberMap);
      
      if (characterMap[char]) {
        currentLineWidth += characterMap[char].width;
        if (!isAltNumberMap && i < word.length - 1) {
          currentLineWidth += 1; // Add margin-right spacing
        }
      } else {
        currentLineWidth += 4; // Unknown character width
        if (i < word.length - 1) {
          currentLineWidth += 1; // Add margin-right spacing
        }
      }
    }
  }
  
  return html;
}

// Function to truncate text to fit within max width with ellipsis
function truncateTextToWidth(text, characterMap, maxWidth) {
  // Handle null/undefined text
  if (!text) {
    return '';
  }
  
  const input = text.toString().toUpperCase();
  const isAltNumberMap = characterMap === altNumberMap;
  
  // Calculate ellipsis width (...) = 3 dots + 2 margins
  const ellipsisWidth = 3 * (characterMap['.'] ? characterMap['.'].width : 1) + (isAltNumberMap ? 0 : 2);
  
  let currentWidth = 0;
  let truncatedText = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const charWidth = characterMap[char] ? characterMap[char].width : 4;
    const marginWidth = (!isAltNumberMap && i < input.length - 1) ? 1 : 0;
    
    // Check if adding this character would exceed limit (leaving room for ellipsis)
    if (currentWidth + charWidth + marginWidth + ellipsisWidth > maxWidth) {
      return truncatedText + '...';
    }
    
    truncatedText += char;
    currentWidth += charWidth + marginWidth;
  }
  
  // If we got here, the full text fits
  return input;
}

function textToSprite(text, maxWidth = null) {
  return textToSpriteHTML(text, charMap, maxWidth);
}

function numberToAltSprite(text, maxWidth = null) {
  return textToSpriteHTML(text, altNumberMap, maxWidth);
}

// Sprite Card special number maker
function count(number) {
  if (number <= 9) {
    return '0000' + number
  } else if (number > 9 && number <= 99) {
    return '000' + number
  } else if (number > 99 && number <= 999) {
    return '00' + number
  } else if (number > 999 && number <= 9999) {
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

  // Sprite Card fetch request 
  const div = document.getElementById('hello');
  const decrementButton = document.getElementById('decrementButton');
  const incrementButton = document.getElementById('incrementButton');
  const pageNumberElement = document.getElementById('pageNumber');

  let currentPage = parseInt(pageNumberElement.innerText, 10);
  let sortBy = ''; // Initialize sortBy outside the functions
  let isFetchingInProgress = false;
  let pageCount = 1; // Initialize pageCount

  // Use a MutationObserver to wait for the select-items element to be created
  const observer = new MutationObserver((mutationsList, observer) => {
    for(const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const selectContainer = document.querySelector('.select-items');
        if (selectContainer) {
          // Attach click event listener to the dynamically created selectContainer
          selectContainer.addEventListener('click', function (event) {
            if (event.target.tagName === 'DIV') {
              sortBy = event.target.getAttribute('value'); // Update sortBy value
              clearAndFetchSprites(sortBy);
            }
          });
          // Stop observing once the element is found
          observer.disconnect();
          break;
        }
      }
    }
  });

  // Start observing the body for changes in the DOM
  observer.observe(document.body, { childList: true, subtree: true });

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
    // Payload CMS sorting mapping (adjust these based on your available sort fields)
    const sortMapping = {
      'createdAt:desc': '-createdAt',
      'createdAt:asc': 'createdAt',
      'updatedAt:desc': '-updatedAt',
      'updatedAt:asc': 'updatedAt',
      'title:desc': '-title',
      'title:asc': 'title',
      'id:desc': '-id',
      'id:asc': 'id'
    };

    // Convert sortBy to Payload CMS format
    const payloadSort = sortMapping[sortBy] || '-createdAt';

    // Append sorting query parameter based on the selected option
    const urlWithSorting = `${apiUrl}&sort=${payloadSort}&page=${currentPage}`;

    // Add headers for authentication if needed
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Option A: API Key in header
        ...(apiKey && { 'X-API-Key': apiKey }),
        // Option B: Authorization header (uncomment if using Bearer tokens)
        // 'Authorization': `Bearer ${apiKey}`,
        // Option C: Custom header
        // 'X-Client-Origin': window.location.hostname,
      }
    };

    return fetch(urlWithSorting, fetchOptions)
      .then(res => {
        
        if (!res.ok) {
          // Log more details about the error
          return res.text().then(text => {
            console.error('Error response body:', text);
            throw new Error(`Network response was not ok: ${res.status} ${res.statusText}`);
          });
        }
        return res.json();
      })
      .then(data => {
        
        // Extract pageCount from the Payload CMS response
        pageCount = data.totalPages;

        const spritePromises = data.docs.map(sprite => {
          // Convert values to sprite format - Payload CMS structure with null checks
          const countValue = count(sprite.id);
          const titleValue = sprite.title || 'Untitled';
          
          // Try different possible field structures
          const iconImageUrl = sprite.iconImage?.url || 
                              sprite.iconimage?.url || 
                              sprite.icon_image?.url || '';
          
          const uploaderName = sprite.uploader?.name || 
                              sprite.createdBy?.name || 
                              sprite.author?.name || 
                              'Unknown';
          
          // Note: You might need to adjust these based on your actual Payload schema
          const gameName = sprite.game?.name || 
                          sprite.series?.name || 
                          'Unknown Game';
          
          const sizeValue = sprite.image?.filesize || 
                           sprite.spritesheet?.filesize || 
                           sprite.file?.filesize || 0;

          const sheetType = sprite.typeOfSheet[0].blockType;
          
          const formattedSize = sizeValue ? formatBytes(sizeValue, 2) : '0 Bytes';

          // Convert text to sprites with word wrapping and truncation
          const spriteNumber = numberToAltSprite(countValue);
          const spriteTitle = textToSprite(truncateTextToWidth(titleValue, charMap, 170), 93);
          const spriteAuthor = textToSprite(truncateTextToWidth(uploaderName, charMap, 85), 93);
          const spriteSection = textToSprite(truncateTextToWidth(sheetType, charMap, 85), 93);
          const spriteCreatedBy = textToSprite(truncateTextToWidth(uploaderName, charMap, 85), 93);
          const spriteSize = textToSprite(truncateTextToWidth(formattedSize, charMap, 85), 93);
          const spriteRecognition = textToSprite(truncateTextToWidth('Asuperlongcharacterstring', charMap, 85), 93);
          const spriteViews = textToSprite('69');

          return Promise.resolve(`
            <a href="/sprites/${sprite.id}" class="sprite-box sprite-glow" target="_blank">
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
              <div class="sprite-number">${spriteNumber}</div>
              <div class="sprite-title">
                <div id="author" class="sprite-text">${spriteTitle}</div>
              </div>
              <div class="sprite-image">
                <img src="${iconImageUrl}" alt="">
              </div>
              <div class="sprite-author">
                <div class="sprite-text">${spriteAuthor}</div>
              </div>
              <div class="sprite-stats">
                <div class="sprite-text">${spriteRecognition}</div>
              </div>
              <div class="sprite-stats">
                <div class="sprite-text">${spriteSection}</div>
              </div>
              <div class="sprite-stats">
                <div class="sprite-text">${spriteViews}</div>
              </div>
              <div class="sprite-stats">
                <div class="sprite-text">${spriteSize}</div>
              </div>
            </a>
          `);
        });

        // Use Promise.all to wait for all sprite HTML blocks
        return Promise.all(spritePromises)
          .then(spriteHtmlArray => {
            div.innerHTML += spriteHtmlArray.join('');
          })
          .catch(error => {
            console.error('Error building sprite HTML:', error);
          });
      })
      .catch(error => {
        console.error('Error fetching sprites:', error);
        div.innerHTML = '<p>Error loading sprites. Please try again later.</p>';
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