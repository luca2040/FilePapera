// Register function to handle clicks outside the sidebar
document.addEventListener("click", handleClickOutside);

// Remove the activate class from sidebar if width is greater than threshold
window.addEventListener("resize", function () {
  const sidebar = document.querySelector(".sidebar");
  if (window.innerWidth >= 768) {
    sidebar.classList.remove("active");
  }
});

// File structure diagram container
const tree_container = document.querySelector(".tree");

// Set auto scroll to ensure visibility of file diagram
function tree_auto_scroll() {
  tree_container.scrollLeft = tree_container.scrollWidth;
}

// Call previous function on load
document.addEventListener("DOMContentLoaded", function () {
  tree_auto_scroll();
});

// Prevent scrolling the tree diagram
tree_container.addEventListener("scroll", function () {
  tree_auto_scroll();
});

// The files container
const files = document.querySelector(".files");

// To set background colors on container
files.addEventListener(
  "mouseenter",
  (event) => {
    if (event.target.classList.contains("file-info")) {
      const parent = event.target.closest(".file-container");
      parent.style.backgroundColor = "var(--accent-green-transparent)";
    }
  },
  true
);

// Set background color on default on mouse leave
files.addEventListener(
  "mouseleave",
  (event) => {
    if (event.target.classList.contains("file-info")) {
      const parent = event.target.closest(".file-container");
      parent.style.backgroundColor = "var(--bg-light)";
    }
  },
  true
);

// Function to handle file drag
files.addEventListener("dragstart", (event) => {
  if (!event.target.classList.contains("file-container")) return;

  toggleSelected(event.target, true);

  const fileOverlay = createOverlay(event.target);
  const overlayContainer = createOverlayContainer(fileOverlay);

  if (multipleSelected()) {
    const secondOverlay = createSecondOverlay(fileOverlay);
    overlayContainer.appendChild(secondOverlay);
  }

  event.dataTransfer.setDragImage(overlayContainer, 0, 0);

  setTimeout(() => {
    document.body.removeChild(overlayContainer);
  }, 0);
});

// If click on general container deselect all files
document.body.addEventListener("click", function (event) {
  const fileContainer = event.target.closest(".file-container");

  if (!fileContainer && !event.shiftKey && !event.ctrlKey) {
    deselectAll();
  }
});