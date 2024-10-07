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

function handleFileOpenExtension(element, extension, size, path, filename) {
  let addClasses = "";
  let codeBlockClass = false;

  switch (extension) {
    case "md":
      addClasses = " y w";
      if (size > MAX_TEXT_FILE_SIZE) return;
      break;
    case "txt":
      addClasses = " x y nw";
      if (size > MAX_TEXT_FILE_SIZE) return;
      break;
    case "css":
      addClasses = " x y nw cdbg";
      codeBlockClass = "nx";
      if (size > MAX_TEXT_FILE_SIZE) return;
      break;
    default:
      return;
  }

  element.classList.add("folder-clickable");

  clickFunc = async () => {
    const fileViewElement = await getFileViewElement(extension, path);

    const modal = document.getElementById("view-file-modal");
    const modalTitle = document.getElementById("view-file-title");
    const closeButton = document.getElementById("view-file-close");
    const viewContent = document.getElementById("view-file-content");
    viewContent.className = "view-modal-element scrollable" + addClasses;

    modalTitle.innerHTML = filename;
    viewContent.innerHTML = fileViewElement;

    if (codeBlockClass) {
      const codeElements = viewContent.querySelectorAll("code");
      codeElements.forEach((code) => {
        code.classList.add(codeBlockClass);
      });
    }

    hljs.highlightAll();

    modal.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    };
    closeButton.onclick = () => {
      modal.style.display = "none";
    };

    modal.style.display = "flex";
  };

  if (isTouchDevice()) {
    element.onclick = clickFunc;
  } else {
    element.ondblclick = clickFunc;
  }
}

async function getFileViewElement(extension, path) {
  switch (extension) {
    case "txt":
      return (
        await (
          await fetch(`/download?filepath=${encodeURIComponent(path)}`)
        ).text()
      ).replace(/\n/g, "<br/>");
    case "md":
      return marked.parse(
        await (
          await fetch(`/download?filepath=${encodeURIComponent(path)}`)
        ).text()
      );
    case "css":
      return marked.parse(
        "```css" +
          (await (
            await fetch(`/download?filepath=${encodeURIComponent(path)}`)
          ).text()) +
          "```"
      );
  }
  return null;
}
