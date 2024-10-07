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

function getLanguageByExtension(extension, filename) {
  for (const langElement of MD_LANGUAGES) {
    if (langElement.ext?.includes(extension)) {
      return langElement.lang;
    }

    if (langElement.name && langElement.name.includes(filename)) {
      return langElement.lang;
    }
  }

  return null;
}

function handleFileOpenExtension(element, extension, size, path, filename) {
  let addClasses = "";
  let codeBlockClass = false;
  let fileLang = null;

  switch (extension) {
    case "md":
      if (size > MAX_TEXT_FILE_SIZE) return;
      addClasses = " y w";
      break;
    case "txt":
    case "gitignore":
      if (size > MAX_TEXT_FILE_SIZE) return;
      addClasses = " x y nw";
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

  element.classList.add("folder-clickable");

  clickFunc = async () => {
    const fileViewElement = await getFileViewElement(extension, fileLang, path);

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

async function getFileViewElement(extension, lang, path) {
  if (lang) {
    // First check if language is known
    return marked.parse(
      `\`\`\`${lang}\n` +
        (await (
          await fetch(`/download?filepath=${encodeURIComponent(path)}`)
        ).text()) +
        `\n\`\`\``
    );
  }

  // Check other extensions
  switch (extension) {
    case "md":
      return marked.parse(
        await (
          await fetch(`/download?filepath=${encodeURIComponent(path)}`)
        ).text()
      );
  }

  // Default is simple text
  return (
    await (await fetch(`/download?filepath=${encodeURIComponent(path)}`)).text()
  ).replace(/\n/g, "<br/>");
}
