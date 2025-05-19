// Check the current path from url, add path to "/" if not present and update url, and then return the path
function checkPath() {
  const urlParams = new URLSearchParams(window.location.search);

  if (!urlParams.has("path")) {
    urlParams.set("path", "/");

    const newUrl = window.location.pathname + "?" + urlParams.toString();
    history.replaceState(null, "", newUrl);

    return "/";
  }

  return urlParams.get("path");
}

// Sets the page url to the given path
function setPagePath(path) {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("path", path);

  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);
}

// Based on shouldAdd, it removes or adds the given attribute to the url
function toggleLinkAttribute(attrName, shouldAdd) {
  const urlParams = new URLSearchParams(window.location.search);

  if (shouldAdd) urlParams.set(attrName, "");
  else urlParams.delete(attrName);

  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);
}

// Gets all the possible subpaths that take to the given filepath, returns as list
// Example:
// Input: "/folder/subfolder/file"
// List element 1: "/folder"
// List element 2: "/folder/subfolder"
// List element 3: "/folder/subfolder/file"
function getSubPaths(filepath) {
  if (!filepath.startsWith("/")) {
    filepath = "/" + filepath;
  }

  const subPaths = [];
  const parts = filepath.split("/").filter((part) => part);

  let currentPath = "";
  for (let i = 0; i < parts.length; i++) {
    currentPath += "/" + parts[i];
    subPaths.push(currentPath);
  }

  return subPaths;
}

// Makes the browser download the given fileapath
function downloadFile(filePath) {
  const url = new URL("/download", window.location.origin);
  url.searchParams.append("filepath", filePath);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filePath.split("/").pop();
  anchor.target = "_blank";

  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
}

// Updates the drag logic for the generic window in html to the given path
function setMainDragDrop(path) {
  const filesMainDiv = document.getElementById("main-total-div");
  filesMainDiv.ondragover = function (event) {
    event.preventDefault();
    event.stopPropagation();
    const isFile = Array.from(event.dataTransfer.items).some(
      (item) => item.kind === "file"
    );

    if (isFile) filesMainDiv.classList.add("dragged-over");
  };

  filesMainDiv.ondragleave = function (event) {
    const isFile = Array.from(event.dataTransfer.items).some(
      (item) => item.kind === "file"
    );

    if (isFile) filesMainDiv.classList.remove("dragged-over");
  };

  filesMainDiv.ondrop = async function (event) {
    event.preventDefault();
    event.stopPropagation();
    filesMainDiv.classList.remove("dragged-over");

    const isFile = Array.from(event.dataTransfer.items).some(
      (item) => item.kind === "file"
    );

    if (isFile) await uploadFilesFromDragEvent(event, path);
  };
}

// Updates the functions behind the replace all files button to auto click for every single file
function checkTotalReplaceButton() {
  const index = filesToProcessList.findIndex(
    (item) => item.waitingfor === true
  );

  replaceButton = document.getElementById("main-replace-button");

  if (index !== -1) {
    replaceButton.style = "display:flex";

    replaceButton.onclick = () => {
      for (const file of filesToProcessList) {
        if (file.waitingfor) {
          removeButtonFromReplaceContainer(file.container);
          file.waitingfor = false;
        }
      }

      checkTotalReplaceButton();
    };
  } else {
    replaceButton.style.display = "none";
  }
}

// Get a list containing the paths of all the selected files
function getSelectedElementsPaths() {
  return Array.from(
    document.querySelectorAll(".files .file-container[selected]"),
    (file) => [file.getAttribute("filePath"), file.getAttribute("fileName")]
  );
}

// Move all the selected files to the given path
async function moveSelectedTo(newPath) {
  if (!newPath.endsWith("/")) {
    newPath += "/";
  }

  const selectedPaths = getSelectedElementsPaths();

  let errors = [];

  for (const [path, name] of selectedPaths) {
    const connectionResponse = await reformatRequest(path, newPath + name);

    if (!connectionResponse) return;

    if (!connectionResponse.ok) {
      try {
        const responseJSON = await connectionResponse.json();
        const responseType = responseJSON["type"];

        errors.push({ name: name, path: path, type: responseType });
      } catch (error) {
        alert(`${TRANSLATIONS.problem_occurred} ${error.message}`);
        window.location.reload();
      }
    }
  }

  reloadFilesRequest();

  let alreadyPresentFiles = [];

  for (const elementError of errors) {
    switch (elementError.type) {
      case 3:
        alreadyPresentFiles.push(elementError.name);
        break;
      // Other errors should not happen, so it is useless to make a UI for them.
      case 1:
        console.log(TRANSLATIONS.error_during_request, elementError.name);
        break;
      case 2:
        console.log(TRANSLATIONS.file_not_found, elementError.name);
        break;
      default:
        console.log(TRANSLATIONS.server_error, elementError.name);
        break;
    }
  }

  if (alreadyPresentFiles.length > 0) {
    const modal = document.getElementById("delete-file-modal");
    const modalTitle = document.getElementById("delete-file-title");
    const closeButton = document.getElementById("delete-file-close");
    const saveButton = document.getElementById("delete-file-save");
    const cancelButton = document.getElementById("delete-file-cancel");
    const deleteName = document.getElementById("delete-file-name");

    modalTitle.innerHTML = TRANSLATIONS.files_already_there;
    deleteName.innerHTML = "";

    cancelButton.style.display = "none";

    alreadyPresentFiles.forEach((name, index) => {
      nameTag = document.createElement("div");
      nameTag.classList = "file-container modal-upload no-text-select";

      nameTag.innerHTML = name;

      deleteName.appendChild(nameTag);
    });

    const closeModal = () => {
      toggleLinkAttribute("modalOpen", false);
      modal.style.display = "none";
    };

    modal.onclick = (event) => {
      if (event.target === modal) closeModal();
    };

    closeButton.onclick = closeModal;
    saveButton.onclick = closeModal;

    toggleLinkAttribute("modalOpen", true);
    modal.style.display = "flex";
  }
}