function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("active");
}

function closeSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.remove("active");
}

function handleClickOutside(event) {
  const sidebar = document.querySelector(".sidebar");
  const menuButton = document.querySelector(".menu-btn");

  if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
    closeSidebar();
  }
}

document.addEventListener("click", handleClickOutside);

window.addEventListener("resize", function () {
  const sidebar = document.querySelector(".sidebar");
  if (window.innerWidth >= 768) {
    sidebar.classList.remove("active");
  }
});

const tree_container = document.querySelector(".tree");

function tree_auto_scroll() {
  tree_container.scrollLeft = tree_container.scrollWidth;
}

tree_auto_scroll();

tree_container.addEventListener("scroll", function () {
  tree_auto_scroll();
});

function setLoadingFilePercentage(container, perc) {
  container.style.background = `linear-gradient(to right, var(--accent-green-transparent) 100%, transparent 0%)`;
  container.style.backgroundSize = `${perc}% 100%`;
  container.style.backgroundPosition = "left";
}

function setLoadingFileComplete(container) {
  container.style.transition =
    "background-size 0.3s ease, background-position 0.3s ease";
  container.style.backgroundSize = `100% 0%`;
  container.style.backgroundPosition = "right";

  setTimeout(() => {
    if (!container) return;
    container.style.transition = "background-color 0.5s ease";
    container.style.background = "var(--transparent-blue)";
  }, 300);
}

function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

const MAX_TEXT_FILE_SIZE = 1 * 1024 * 1024;

function handleFileOpenExtension(element, extension, size, path) {
  switch (extension) {
    case ".txt":
      if (size < MAX_TEXT_FILE_SIZE) {
        element.classList.add("folder-clickable");

        clickFunc = () => {
          console.log(path, extension);
        };

        if (isTouchDevice()) {
          nameSpan.onclick = clickFunc;
        } else {
          nameSpan.ondblclick = clickFunc;
        }
        break;
      }
  }
}
