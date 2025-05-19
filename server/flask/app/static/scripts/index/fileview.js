// Get the language by the file's extension
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

// Handles the extension of the opened file
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

// Get the file element's container
function getFileViewElement(extension, lang, path, element) {
  const createLoader = () => {
    const loaderContainer = document.createElement("div");
    const loader = document.createElement("div");
    loader.className = "loading-icon";
    loaderContainer.className = "loading-container";
    loaderContainer.appendChild(loader);
    return loaderContainer;
  };

  const escapeHtml = (text) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");


  const displayContent = (content, loaderContainer, markdown) => {
    loaderContainer.style.display = "none";

    element.innerHTML = DOMPurify.sanitize(
      lang
        ? marked.parse(`\`\`\`${lang}\n${content}\n\`\`\``)
        : markdown
          ? marked.parse(content)
          : escapeHtml(content).replace(/\n/g, "<br/>")
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
          alert(TRANSLATIONS.error_loading_file);
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
        element.innerText = TRANSLATIONS.error_loading_image;
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
        element.innerText = TRANSLATIONS.error_loading_pdf;
      };

      element.appendChild(pdfElement);
      return;

    default:
      fetchAndDisplay(completePath, loaderContainer, false);
      return;
  }
}
