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

const files = document.querySelector(".files");

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

function multipleSelected() {
  const selectedPaths = document.querySelectorAll(
    ".files .file-container[selected]"
  );
  return selectedPaths.length >= 2;
}

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

function createOverlay(target) {
  const overlay = target.cloneNode(true);
  const fileInfo = target.querySelector(".file-info").cloneNode(true);
  overlay.innerHTML = "";
  overlay.appendChild(fileInfo);
  return overlay;
}

function createOverlayContainer(overlay) {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.appendChild(overlay);
  document.body.appendChild(container);
  return container;
}

function createSecondOverlay(originalOverlay) {
  const secondOverlay = originalOverlay.cloneNode(true);
  const targetStyle = window.getComputedStyle(originalOverlay);

  secondOverlay.style.position = "absolute";
  secondOverlay.style.top = "15px";
  secondOverlay.style.left = "15px";
  secondOverlay.style.opacity = "0.8";
  secondOverlay.style.width = targetStyle.width;
  secondOverlay.style.height = targetStyle.height;
  secondOverlay.innerHTML = "";

  return secondOverlay;
}

function toggleSelected(element, isSelected) {
  if (isSelected) {
    element.setAttribute("selected", "");
  } else {
    element.removeAttribute("selected");
  }
}

function deselectAll() {
  const files = document.querySelectorAll(".file-container");
  files.forEach((file) => {
    toggleSelected(file, false);
  });
}

document.body.addEventListener("click", function (event) {
  const fileContainer = event.target.closest(".file-container");

  if (!fileContainer && !event.shiftKey && !event.ctrlKey) {
    deselectAll();
  }
});

function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

const MD_LANGUAGES = [
  { lang: "abap", ext: ["abap"] },
  { lang: "actionscript", ext: ["as"] },
  { lang: "ada", ext: ["adb", "ads"] },
  { lang: "angelscript", ext: ["as"] },
  { lang: "apache", ext: ["conf"] },
  { lang: "applescript", ext: ["applescript"] },
  { lang: "arcade", ext: ["arcade"] },
  { lang: "asciidoc", ext: ["adoc", "asciidoc"] },
  { lang: "aspectj", ext: ["aj"] },
  { lang: "autohotkey", ext: ["ahk"] },
  { lang: "autoit", ext: ["au3"] },
  { lang: "awk", ext: ["awk"] },
  { lang: "bash", ext: ["sh", "bash", "zsh"] },
  { lang: "basic", ext: ["bas"] },
  { lang: "bnf", ext: ["bnf"] },
  { lang: "brainfuck", ext: ["b", "bf"] },
  { lang: "csharp", ext: ["cs"] },
  { lang: "cpp", ext: ["cpp", "cxx", "hpp", "h"] },
  { lang: "c", ext: ["c", "h"] },
  { lang: "cmake", ext: ["cmake"] },
  { lang: "coffeescript", ext: ["coffee"] },
  { lang: "crystal", ext: ["cr"] },
  { lang: "css", ext: ["css"] },
  { lang: "d", ext: ["d"] },
  { lang: "dart", ext: ["dart"] },
  { lang: "delphi", ext: ["pas", "dpr"] },
  { lang: "diff", ext: ["diff", "patch"] },
  { lang: "django", ext: ["html", "jinja"] },
  {
    lang: "dockerfile",
    ext: ["Dockerfile", "dockerfile"],
    name: ["Dockerfile", "dockerfile"],
  },
  { lang: "ebnf", ext: ["ebnf"] },
  { lang: "elixir", ext: ["ex", "exs"] },
  { lang: "elm", ext: ["elm"] },
  { lang: "erlang", ext: ["erl"] },
  { lang: "fortran", ext: ["f90", "f95", "for"] },
  { lang: "fsharp", ext: ["fs", "fsi", "fsx"] },
  { lang: "gcode", ext: ["gcode"] },
  { lang: "gherkin", ext: ["feature"] },
  { lang: "glsl", ext: ["glsl", "vert", "frag"] },
  { lang: "go", ext: ["go"] },
  { lang: "graphql", ext: ["graphql", "gql"] },
  { lang: "groovy", ext: ["groovy"] },
  { lang: "haml", ext: ["haml"] },
  { lang: "handlebars", ext: ["hbs", "handlebars"] },
  { lang: "haskell", ext: ["hs"] },
  { lang: "haxe", ext: ["hx"] },
  { lang: "html", ext: ["html", "htm"] },
  { lang: "http", ext: ["http"] },
  { lang: "ini", ext: ["ini", "toml"] },
  { lang: "java", ext: ["java", "jsp"] },
  { lang: "javascript", ext: ["js", "jsx"] },
  { lang: "json", ext: ["json"] },
  { lang: "julia", ext: ["jl"] },
  { lang: "kotlin", ext: ["kt", "kts"] },
  { lang: "latex", ext: ["tex"] },
  { lang: "less", ext: ["less"] },
  { lang: "lisp", ext: ["lisp", "cl"] },
  { lang: "lua", ext: ["lua"] },
  { lang: "makefile", ext: ["Makefile"] },
  { lang: "markdown", ext: ["md", "markdown"] },
  { lang: "matlab", ext: ["m"] },
  { lang: "mipsasm", ext: ["asm", "s"] },
  { lang: "nginx", ext: ["nginxconf"] },
  { lang: "nim", ext: ["nim"] },
  { lang: "objectivec", ext: ["m", "mm"] },
  { lang: "ocaml", ext: ["ml"] },
  { lang: "perl", ext: ["pl", "pm"] },
  { lang: "php", ext: ["php"] },
  { lang: "plaintext", ext: ["txt"] },
  { lang: "powershell", ext: ["ps1"] },
  { lang: "protobuf", ext: ["proto"] },
  { lang: "python", ext: ["py"] },
  { lang: "r", ext: ["r"] },
  { lang: "ruby", ext: ["rb"] },
  { lang: "rust", ext: ["rs"] },
  { lang: "scala", ext: ["scala"] },
  { lang: "scheme", ext: ["scm"] },
  { lang: "scss", ext: ["scss"] },
  { lang: "shell", ext: ["sh"] },
  { lang: "sql", ext: ["sql"] },
  { lang: "swift", ext: ["swift"] },
  { lang: "typescript", ext: ["ts", "tsx"] },
  { lang: "vbnet", ext: ["vb"] },
  { lang: "vhdl", ext: ["vhd", "vhdl"] },
  { lang: "xml", ext: ["xml"] },
  { lang: "yaml", ext: ["yml", "yaml"] },
];

const MAX_TEXT_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
const MAX_IMAGE_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_PDF_FILE_SIZE = 500 * 1024 * 1024; // 0.5 GB

function getLanguageByExtension(extension, filename) {
  for (const langElement of MD_LANGUAGES) {
    if (langElement.ext?.includes(extension.toLowerCase())) {
      return langElement.lang;
    }

    if (langElement.name && langElement.name.includes(filename.toLowerCase())) {
      return langElement.lang;
    }
  }

  return null;
}

function handleFileOpenExtension(element, extension, size, path, filename) {
  let addClasses = "";
  let codeBlockClass = false;
  let fileLang = null;

  switch (extension.toLowerCase()) {
    case "md":
      if (size > MAX_TEXT_FILE_SIZE) return;
      addClasses = " y w";
      break;

    case "txt":
    case "gitignore":
      if (size > MAX_TEXT_FILE_SIZE) return;
      addClasses = " x y nw";
      break;

    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "bmp":
    case "svg":
    case "webp":
    case "ico":
      if (size > MAX_IMAGE_FILE_SIZE) return;
      addClasses = " y";
      break;

    case "pdf":
      if (size > MAX_PDF_FILE_SIZE) return;
      // addClasses = " y";
      break;

    default:
      fileLang = getLanguageByExtension(extension, filename);
      if (fileLang) {
        if (size > MAX_TEXT_FILE_SIZE) return;
        addClasses = " x y nw cdbg";
        codeBlockClass = "nx";
        break;
      }
      return;
  }

  const clickFunc = async () => {
    const viewContent = document.getElementById("view-file-content");
    viewContent.className = "view-modal-element scrollable" + addClasses;

    getFileViewElement(extension, fileLang, path, viewContent);

    const modal = document.getElementById("view-file-modal");
    const modalTitle = document.getElementById("view-file-title");
    const closeButton = document.getElementById("view-file-close");

    modalTitle.innerHTML = filename;

    if (codeBlockClass) {
      const codeElements = viewContent.querySelectorAll("code");
      codeElements.forEach((code) => {
        code.classList.add(codeBlockClass);
      });
    }

    modal.onclick = (event) => {
      if (event.target === modal) {
        toggleLinkAttribute("modalOpen", false);
        modal.style.display = "none";
      }
    };
    closeButton.onclick = () => {
      toggleLinkAttribute("modalOpen", false);
      modal.style.display = "none";
    };

    toggleLinkAttribute("modalOpen", true);
    modal.style.display = "flex";
  };

  return clickFunc;
}

async function fetchText(path) {
  const response = await fetch(path);

  if (response.status !== 200) {
    alert("Errore durante la richiesta");
    window.location.reload();
  }

  return await response.text();
}

function getFileViewElement(extension, lang, path, element) {
  const createLoader = () => {
    const loaderContainer = document.createElement("div");
    const loader = document.createElement("div");
    loader.className = "loading-icon";
    loaderContainer.className = "loading-container";
    loaderContainer.appendChild(loader);
    return loaderContainer;
  };

  const displayContent = (content, loaderContainer, markdown) => {
    loaderContainer.style.display = "none";

    element.innerHTML = DOMPurify.sanitize(
      lang
        ? marked.parse(`\`\`\`${lang}\n${content}\n\`\`\``)
        : markdown
        ? marked.parse(content)
        : content.replace(/\n/g, "<br/>")
    );

    hljs.highlightAll();
  };

  const fetchAndDisplay = (completePath, loaderContainer, markdown) => {
    return new Promise((resolve, reject) => {
      fetchText(completePath)
        .then((content) => {
          return displayContent(content, loaderContainer, markdown);
        })
        .then(() => {
          resolve();
        })
        .catch((err) => {
          alert("Errore durante il caricamento del file.");
          window.location.reload();
          reject(err);
        });
    });
  };

  const loaderContainer = createLoader();
  element.innerHTML = "";
  element.appendChild(loaderContainer);

  const completePath = `/download?filepath=${encodeURIComponent(path)}`;

  if (lang) {
    fetchAndDisplay(completePath, loaderContainer, false);
    return;
  }

  switch (extension.toLowerCase()) {
    case "md":
      fetchAndDisplay(completePath, loaderContainer, true);
      return;

    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "bmp":
    case "svg":
    case "webp":
    case "ico":
      const imageElement = document.createElement("img");
      imageElement.src = completePath;
      imageElement.className = "view-image";
      imageElement.style.display = "none";

      imageElement.onload = () => {
        loaderContainer.style.display = "none";
        imageElement.style.display = "block";
      };

      imageElement.onerror = () => {
        loaderContainer.style.display = "none";
        element.innerText = "Errore nel caricamento dell'immagine.";
      };

      element.appendChild(imageElement);
      return;

    case "pdf":
      const pdfElement = document.createElement("iframe");
      pdfElement.src = `${completePath}&pdf=true`;
      pdfElement.className = "view-pdf";
      pdfElement.style.display = "none";

      pdfElement.onload = () => {
        loaderContainer.style.display = "none";
        pdfElement.style.display = "block";
      };

      pdfElement.onerror = () => {
        loaderContainer.style.display = "none";
        element.innerText = "Errore durante il caricamento del file PDF.";
      };

      element.appendChild(pdfElement);
      return;

    default:
      fetchAndDisplay(completePath, loaderContainer, false);
      return;
  }
}
