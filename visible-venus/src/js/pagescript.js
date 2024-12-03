// Global variables
let comicId;
let metadataUrl;

function getCurrentPageNum() {
  let page = window.location.hash.substr(1);
  if (page == "" || typeof page === 'undefined') {
    page = 0;
  }
  return parseInt(page);
}


(function() {
    // Function to get the value of a URL parameter by name
    function getQueryParam(paramName) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(paramName);
    }

    // Assign values to global variables
    comicId = getQueryParam('comic_id');
    if (comicId) {
        metadataUrl = `https://cdn.sgxp.me/smackjeeves_archive/smackjeeves-${comicId}/${comicId}/metadata.js`;

        const scriptElement = document.createElement('script');
        scriptElement.src = metadataUrl;
        scriptElement.type = 'text/javascript';

        // Append the script to the document head
        document.head.appendChild(scriptElement);

        // Define what happens when the metadata script is loaded
        scriptElement.onload = function() {
          console.log('Metadata loaded successfully for comic ID:', comicId);
        
          // Proceed with the next steps after metadata is loaded
          proceedWithNextSteps();
        
          // Populate both select dropdowns after metadata is available
          $("#chapter-select, #chapter-select-bottom").empty(); // Clear existing options
          $("#chapter-select, #chapter-select-bottom").append($("<option>", { value: 0, text: "Home - " + metadata.title }));
          $.each(metadata.chapters, function(key, chapter) {
              $("#chapter-select, #chapter-select-bottom").append($("<option>", {
                  value: chapter.chapterNumber,
                  text: chapter.chapterNumber + " - " + chapter.articleTitle
              }));
          });
        
          // Synchronize the two dropdowns
          $("#chapter-select, #chapter-select-bottom").change(function() {
              const pageNum = $(this).val();
              setPage(pageNum);
              $("#chapter-select, #chapter-select-bottom").val(pageNum); // Keep both dropdowns synchronized
          });
      
          // New snippet with event delegation
          $("body").on("change", "#chapter-select, #chapter-select-bottom", function() {
              const pageNum = $(this).val();
              setPage(pageNum);
              $("#chapter-select, #chapter-select-bottom").val(pageNum); // Keep both dropdowns synchronized
          });
      };
      
      

        // Error handling if the script fails to load
        scriptElement.onerror = function() {
            console.error('Failed to load metadata for comic ID:', comicId);
        };
    } else {
        console.error('No comic ID found in the URL.');
    }

    // Define a function that proceeds with further operations
    function proceedWithNextSteps() {
      // Your code that needs to run after metadata is available
      console.log("Executing the rest of the script...");
  
      ///////////////////////////////////////////////////
      // Parse metadata and generate html for each page
      ///////////////////////////////////////////////////
      // Generate main page
      metadata["descriptionHTML"] = metadata["description"].replace(/(\r\n|\n|\r)/g,"<br />")
      metadata["numChapters"] = metadata.chapters.length
      metadata["firstPosted"] = metadata.chapters[0].distributedDate.split("T")[0]
      $("header .comic-title").html(`<a href="#0">${metadata.title}</a>`)
  
      // Generate each chapters page
      $.each( metadata.chapters, function(key, chapter) {
          chapter.chapterNumber = key + 1
          if (typeof chapter["authorComment"] !== 'undefined'){
              chapter["authorCommentHTML"] = chapter["authorComment"].replace(/(\r\n|\n|\r)/g,"<br />")
          }
  
          $.each( chapter.comments, function(key, comment) {
              chapter.comments[key]["commentHTML"] = comment["commentText"].replace(/(\r\n|\n|\r)/g,"<br />")
          })
          // Used for the next/prev button links
          chapter["nextPage"] = chapter.chapterNumber + 1
          chapter["prevPage"] = chapter.chapterNumber - 1
          chapter["isLastPage"] = chapter.chapterNumber == metadata.chapters.length
          pageHtml.push(Mustache.render(comicPageTemplate, chapter))
      })
  
      // Push to main page to the front. Needed so we can fix the ChapterNumber issues when looping over the chapters above
      pageHtml.unshift(Mustache.render(mainTemplate, metadata))
  
      // Set correct page to display
      setPage(getCurrentPageNum())
  
      ////////////
      // Actions
      ////////////
      window.onpopstate = function(event) {
          setPage(getCurrentPageNum())
      }
  
      // Change page on chapter selection from main page's TOC
      $("body").on("click", "#chapter-toc li a", function(event) {
          setPage($(this)[0].dataset.chapter_num)
      })
  
      // Go home when Comic title is clicked
      $("body").on("click", "header .comic-title", function(event) {
          setPage(0)
      })
  
      $("body").on("click", ".comic img", function(event) {
          setPage(getCurrentPageNum() + 1)
      })
  
      $("body").on("click", "#page-next", function(event) {
          setPage(getCurrentPageNum() + 1)
      })
  
      $("body").on("click", "#page-prev", function(event) {
          setPage(getCurrentPageNum() - 1)
      })
  
      $("body").on("keyup", function(event) {
          if (event.keyCode == 37) {
              setPage(getCurrentPageNum() - 1)
          } else if (event.keyCode == 39) {
              setPage(getCurrentPageNum() + 1)
          }
      })
  
      // Back to top button
      $("#to-top").click(function() {
          $("html,body").scrollTop(0)
      })
  }
  

})();

let pageHtml = []
let mainTemplate = `
  <section class="page-inner comic-info-wrapper">
    <div class="comic-info">
      <h4>Creators</h4>
      <div class="authors">
        {{ #authors }}
          <span class="author">
            <img src="https://cdn.sgxp.me/smackjeeves_archive/{{ imgPath }}" class="avatar" onerror="this.onerror=null;this.src='https://cdn.sgxp.me/smackjeeves_archive/comic/KansDefaultgif2.gif';" />{{ name }}
          </span>
        {{ /authors }}
      </div>
      <div class="details">
        <div class="detail"><h4>Date Created:</h4> {{ firstPosted }}</div>
      </div>
      <div class="details">
        <div class="detail"><h4>Chapters:</h4> {{ numChapters }}</div>
      </div>

      <h4>Description</h4>
      {{{ descriptionHTML }}}
    </div>
  </section>

  <section class="page-inner">
    <hr />
    <h2>Chapter List</h2>
    <ol id="chapter-toc">
      {{ #chapters }}
        <li class="chapter-row">
          <a href="#{{ chapterNumber }}" data-chapter_num="{{ chapterNumber }}">
            <img class="chapter-cover" src="https://cdn.sgxp.me/smackjeeves_archive/smackjeeves-${comicId}/${comicId}/{{ pagesPath }}" onerror="this.onerror=null;this.src='https://cdn.sgxp.me/smackjeeves_archive/comic/KansDefaultgif2.gif';" /> <span>{{ chapterNumber }} - {{ articleTitle }}</span>
          </a>
        </li>
      {{ /chapters }}
    </ol>
  </section>
`

let comicPageTemplate = `
  <section class="page-inner">
    <h4 class="chapter-num">Chapter {{ chapterNumber }}</h4>
    <h2 class="center">{{ articleTitle }}</h2>

    
    

    <div class="comic center">
        <img src="https://cdn.sgxp.me/smackjeeves_archive/smackjeeves-${comicId}/${comicId}/{{ pagesPath }}" class="{{ ^isLastPage }} clickable {{ /isLastPage }}" onerror="this.onerror=null;this.src='https://cdn.sgxp.me/smackjeeves_archive/comic/KansDefaultgif2.gif';" />
      {{ ^pagesPath.0 }}<span class="missing">Image missing even on Smackjeeves</span>{{ /pagesPath.0 }}
    </div>

    <a id="page-prev" class="page-nav" href="#{{ prevPage }}">&lt;</a>
    {{ ^isLastPage }}

    <div class="select-container center">
      <div class="chapter-select">
        <select id="chapter-select-bottom"></select>
      </div>
    </div>

    <a id="page-next" class="page-nav" href="#{{ nextPage }}">&gt;</a>
    {{ /isLastPage }}
    
  </section>

  <section class="page-inner comments">
      <h3>User Comments</h3>
      {{ #comments }}
        <div class="comment">
          <div class="comment-header">
            <img src="https://cdn.sgxp.me/smackjeeves_archive/{{ imgPath }}" class="avatar" onerror="this.onerror=null;this.src='https://cdn.sgxp.me/smackjeeves_archive/comic/KansDefaultgif2.gif';" />
            <span class="username">{{ nickname }}</span>
            <span class="timestamp">{{ time }}</span>
          </div>
          <div class="content">{{{ commentHTML }}}</div>
          <hr />
        </div>
      {{ /comments }}
      {{ ^comments.0 }}<span class="missing">No comments</span>{{ /comments.0 }}
  </section>
`


function setPage(pg_num) {
  if (pg_num > metadata.chapters.length) {
    return;
  }

  pg_num = parseInt(pg_num);
  window.location.hash = pg_num;
  
  // Create HTML for comic title
  const comicTitleHtml = `<div class="comic-content-title"><a href="#0">${metadata.title}</a></div>`; 

  // Inject the comic title inside the comic-content div, along with the page content
  $("#comic-page").html(comicTitleHtml + pageHtml[pg_num]);

  // Re-populate the dropdowns on every page load
  $("#chapter-select-bottom").empty(); // Clear existing options
  $("#chapter-select-bottom").append($("<option>", { value: 0, text: "Home - " + metadata.title }));
  $.each(metadata.chapters, function(key, chapter) {
    $("#chapter-select-bottom").append($("<option>", {
      value: chapter.chapterNumber,
      text: chapter.chapterNumber + " - " + chapter.articleTitle
    }));
  });

  // Sync the dropdowns
  $("#chapter-select-bottom").val(pg_num);

  // Initialize custom chapter select after populating options
  initializeChapterSelect();

  $("html,body").scrollTop(0); // Scroll to the top of the page
  $("#to-top").attr("href", `#${pg_num}`); // Update the 'back to top' button
}

function closeAllChapterSelect(elmnt) {
  const chapterItems = document.getElementsByClassName("chapter-items");
  const chapterSelected = document.getElementsByClassName("chapter-selected");
  for (let i = 0; i < chapterSelected.length; i++) {
    // Skip if the clicked element is the current chapter-selected element
    if (elmnt === chapterSelected[i]) {
      continue;
    }
    
    // Always remove arrow-active class from other elements
    chapterSelected[i].classList.remove("chapter-arrow-active");
    
    // Hide other chapter items
    const siblingItems = chapterSelected[i].nextSibling;
    if (siblingItems) {
      siblingItems.classList.add("chapter-hide");
    }
  }
}

// Modify the event listener to check the target
document.addEventListener("click", function(event) {
  // Check if the click is outside any chapter-select elements
  const chapterSelects = document.getElementsByClassName("chapter-select");
  
  for (let i = 0; i < chapterSelects.length; i++) {
    const chapterSelected = chapterSelects[i].querySelector(".chapter-selected");
    const chapterItems = chapterSelects[i].querySelector(".chapter-items");
    
    // Check if the click is outside the current chapter-select
    if (!chapterSelects[i].contains(event.target)) {
      chapterSelected.classList.remove("chapter-arrow-active");
      chapterItems.classList.add("chapter-hide");
    }
  }
});

function truncateText(text, maxLength) {
  return text.length > maxLength 
    ? text.substring(0, maxLength) + '...' 
    : text;
}

function initializeChapterSelect() {
  const chapterSelects = document.getElementsByClassName("chapter-select");

  for (let i = 0; i < chapterSelects.length; i++) {
    const selElmnt = chapterSelects[i].getElementsByTagName("select")[0];

    // Remove any existing custom elements
    const existingCustom = chapterSelects[i].getElementsByClassName("chapter-selected");
    const existingItems = chapterSelects[i].getElementsByClassName("chapter-items");
    while (existingCustom.length > 0) {
      existingCustom[0].remove();
    }
    while (existingItems.length > 0) {
      existingItems[0].remove();
    }

    const chapterSelected = document.createElement("DIV");
    chapterSelected.setAttribute("class", "chapter-selected");
    
    // Truncate the initial selected option text
    chapterSelected.innerHTML = truncateText(
      selElmnt.options[selElmnt.selectedIndex].innerHTML, 
      20
    );
    chapterSelects[i].appendChild(chapterSelected);

    const chapterItems = document.createElement("DIV");
    chapterItems.setAttribute("class", "chapter-items chapter-hide");
    
    // Add scrollable container if more than 7 items
    if (selElmnt.length > 7) {
      chapterItems.classList.add("chapter-items-scrollable");
    }

    // Loop through each option in the select
    for (let j = 0; j < selElmnt.length; j++) {
      const chapterItem = document.createElement("DIV");
      // Truncate the text for each list item
      chapterItem.innerHTML = truncateText(
        selElmnt.options[j].innerHTML, 
        30
      );
      
      // Store the full original text as a data attribute
      chapterItem.setAttribute('data-full-text', selElmnt.options[j].innerHTML);
      
      chapterItem.addEventListener("click", function (e) {
        const y = this.parentNode.parentNode.getElementsByTagName("select")[0];
        const h = this.parentNode.previousSibling;

        for (let k = 0; k < y.length; k++) {
          // Use the full original text for matching
          if (y.options[k].innerHTML == this.getAttribute('data-full-text')) {
            y.selectedIndex = k;
            
            // Truncate the text when updating the displayed value
            h.innerHTML = truncateText(this.getAttribute('data-full-text'), 20);

            const selectedItems = this.parentNode.getElementsByClassName("chapter-as-selected");
            for (let m = 0; m < selectedItems.length; m++) {
              selectedItems[m].removeAttribute("class");
            }
            this.setAttribute("class", "chapter-as-selected");
            break;
          }
        }
        h.click();
        // Change the page when a new chapter is selected
        const pageNum = y.value;
        setPage(pageNum);

        // Close the dropdown after selection
        this.parentNode.classList.add("chapter-hide");
        h.classList.remove("chapter-arrow-active");
      });
      chapterItems.appendChild(chapterItem);
    }

    chapterSelects[i].appendChild(chapterItems);

    chapterSelected.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent the click from propagating to the document
      
      // Toggle the dropdown for the current button
      this.nextSibling.classList.toggle("chapter-hide");
      this.classList.toggle("chapter-arrow-active");
      
      // Close other dropdowns
      closeAllChapterSelect(this);
    });
  }
}

// The rest of the script remains the same as in the previous version

function closeAllChapterSelect(elmnt) {
  const chapterItems = document.getElementsByClassName("chapter-items");
  const chapterSelected = document.getElementsByClassName("chapter-selected");
  for (let i = 0; i < chapterSelected.length; i++) {
    // Skip if the clicked element is the current chapter-selected element
    if (elmnt === chapterSelected[i]) {
      continue;
    }
    
    // Always remove arrow-active class from other elements
    chapterSelected[i].classList.remove("chapter-arrow-active");
    
    // Hide other chapter items
    const siblingItems = chapterSelected[i].nextSibling;
    if (siblingItems) {
      siblingItems.classList.add("chapter-hide");
    }
  }
}

document.addEventListener("click", function(event) {
  // Check if the click is outside any chapter-select elements
  const chapterSelects = document.getElementsByClassName("chapter-select");
  
  for (let i = 0; i < chapterSelects.length; i++) {
    const chapterSelected = chapterSelects[i].querySelector(".chapter-selected");
    const chapterItems = chapterSelects[i].querySelector(".chapter-items");
    
    // Check if the click is outside the current chapter-select
    if (!chapterSelects[i].contains(event.target)) {
      chapterSelected.classList.remove("chapter-arrow-active");
      chapterItems.classList.add("chapter-hide");
    }
  }
});

// Optional: Add CSS to support scrolling
const style = document.createElement('style');
style.textContent = `
.chapter-items-scrollable {
  max-height: 210px; /* Approximately 7 items at 30px height */
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--font-link-color) color-mix(in srgb, var(--page-color) 80%, white);
}

.chapter-items-scrollable::-webkit-scrollbar {
  width: 8px;
}

.chapter-items-scrollable::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.chapter-items-scrollable::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.chapter-items-scrollable::-webkit-scrollbar-thumb:hover {
  background: #555;
}
`;
document.head.appendChild(style);