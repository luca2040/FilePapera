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

function setPagePath(path) {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("path", path);

  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);
}

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

async function getStorage() {
  const url = "/storage";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = `Errore: ${response.status} - ${response.statusText}`;
      alert(errorText);
      window.location.reload();
      return;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    alert(`Si è verificato un problema: ${error.message}`);
    window.location.reload();
  }

  return null;
}

async function reformatRequest(old_path, new_path) {
  const url = `/reformat?old_path=${encodeURIComponent(
    old_path
  )}&new_path=${encodeURIComponent(new_path)}`;

  try {
    const response = await fetch(url);
    return response;
  } catch (error) {
    alert(`Si è verificato un problema: ${error.message}`);
    window.location.reload();
  }

  return null;
}

async function deleteElement(path) {
  const url = `/delete?target=${encodeURIComponent(path)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = `Errore: ${response.status} - ${response.statusText}`;
      alert(errorText);
      window.location.reload();
      return;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    alert(`Si è verificato un problema: ${error.message}`);
    window.location.reload();
  }

  return null;
}

async function createFolder(basePath, name) {
  const url = `/new/folder?path=${encodeURIComponent(
    basePath
  )}&name=${encodeURIComponent(name)}`;

  try {
    const response = await fetch(url, { method: "POST" });
    return response;
  } catch (error) {
    alert(`Si è verificato un problema: ${error.message}`);
    window.location.reload();
  }

  return null;
}

async function getAvailableFiles(query) {
  const url = "/upload/available-files";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    });
    return response;
  } catch (error) {
    alert(`Si è verificato un problema: ${error.message}`);
    window.location.reload();
  }

  return null;
}

async function set_usage_bar() {
  const storage_json = await getStorage();

  const used_bytes = storage_json["used_size"];
  const max_bytes = storage_json["max_size"];

  let percent = (used_bytes / max_bytes) * 100;
  percent = percent.toFixed(1);

  const barElement = document.getElementById("storage-bar-progress");
  barElement.style.width = `${percent}%`;

  const textElement = document.getElementById("storage-bar-info");

  const storageText = document.createElement("span");
  const storagePercent = document.createElement("span");

  storageText.className = "storage-text";
  storagePercent.className = "storage-percentage";

  storageText.innerHTML = `${formatFileSize(used_bytes)} / ${formatFileSize(
    max_bytes
  )}`;
  storagePercent.innerHTML = `${percent}%`;

  textElement.innerHTML = "";
  textElement.appendChild(storageText);
  textElement.appendChild(storagePercent);
}

function downloadFile(filePath) {
  const url = new URL("/download", window.location.origin);
  url.searchParams.append("filepath", filePath);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filePath.split("/").pop();

  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
}

async function loadFileList(filePath) {
  const url = `/list?path=${encodeURIComponent(filePath)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = `Errore: ${response.status} - ${response.statusText}`;
      alert(errorText);
      window.location.reload();
      return;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    alert(`Si è verificato un problema: ${error.message}`);
    window.location.reload();
  }

  return null;
}

async function loadFolderStructure(parent, paths, index) {
  if (index === 0) {
    const rootNode = document.getElementById("root-node");
    rootNode.onclick = () => {
      setPagePath("/");
      reloadFilesRequest();
    };

    if (paths.length <= 1) {
      rootNode.className = "node node-main current";
      return;
    } else rootNode.className = "node node-main current-less";
  }

  if (index >= paths.length) return;

  let fileListJson = await loadFileList(paths[index]);
  fileListJson = fileListJson["files"];

  for (const element of fileListJson) {
    if (!element["file"]) {
      const elementContainer = document.createElement("li");
      const node = document.createElement("div");
      node.className = "node";
      node.onclick = () => {
        setPagePath(element["path"]);
        reloadFilesRequest();
      };

      const isCurrentFolder = element["path"] === paths[index + 1];
      const isOpenFolder = element["path"] === paths[paths.length - 1];
      if (isOpenFolder) node.classList.add("current");
      else if (isCurrentFolder) node.classList.add("current-less");

      elementContainer.appendChild(node);

      if (isCurrentFolder && !isOpenFolder) {
        const internalContainer = document.createElement("ul");
        await loadFolderStructure(internalContainer, paths, index + 1);
        elementContainer.appendChild(internalContainer);
      }

      parent.appendChild(elementContainer);
    }
  }
}

async function reloadFilesRequest() {
  filepath = checkPath();
  fileListJson = await loadFileList(filepath);

  const pageNotFound = "not_found" in fileListJson;

  reloadFiles(fileListJson, filepath, pageNotFound);
  uploadButtons(filepath);

  if (pageNotFound) {
    const nodesGroup = document.getElementById("main-node-group");
    nodesGroup.innerHTML = "";
    await loadFolderStructure(nodesGroup, ["/"], 0);
  } else {
    let subPaths = getSubPaths(filepath);
    subPaths = ["/"].concat(subPaths);
    const nodesGroup = document.getElementById("main-node-group");
    nodesGroup.innerHTML = "";
    await loadFolderStructure(nodesGroup, subPaths, 0);
  }

  await set_usage_bar();

  tree_auto_scroll();
}

function generateFilePathHTML(filepath, pathNotFound, completeMode) {
  let folders = [];

  if (!(filepath === "" || filepath === "/")) {
    folders = filepath.replace(/^\/|\/$/g, "").split("/");
  }

  const containerDiv = document.createElement("div");
  containerDiv.className = "file-path-container";

  const returnDiv = document.createElement("div");
  returnDiv.id = "file-path-return";

  if (pathNotFound) {
    const returnButton = document.createElement("button");
    returnButton.className = "upload-file file-path-return";
    returnButton.style = "margin-right:10px;";

    const returnIcon = document.createElement("i");
    returnIcon.className = "fa fa-level-up return-span";
    returnIcon.setAttribute("aria-hidden", "true");

    returnButton.appendChild(returnIcon);

    returnButton.onclick = () => {
      window.history.back();
    };

    returnDiv.appendChild(returnButton);
  } else if (filepath != "/" && filepath != "") {
    const returnButton = document.createElement("button");
    returnButton.className = "upload-file file-path-return";
    returnButton.style = "margin-right:10px;";

    const dividedFilepath = ["/"].concat(getSubPaths(filepath));

    returnButton.onclick = () => {
      setPagePath(dividedFilepath[dividedFilepath.length - 2]);
      reloadFilesRequest();
    };

    if (completeMode) {
      const returnIcon = document.createElement("i");
      returnIcon.className = "fa fa-level-up return-span";
      returnIcon.setAttribute("aria-hidden", "true");

      returnButton.appendChild(returnIcon);
      returnDiv.appendChild(returnButton);
    }
  }

  const pathInfoDiv = document.createElement("div");
  pathInfoDiv.className = "file-path-info";

  if (!completeMode) pathInfoDiv.classList.add("dark");

  if (pathNotFound) {
    const rootSeparatorSpan = document.createElement("span");
    rootSeparatorSpan.className = "path-separator error";
    rootSeparatorSpan.textContent = "Percorso non trovato";
    pathInfoDiv.appendChild(rootSeparatorSpan);
  } else {
    const rootSpan = document.createElement("span");
    rootSpan.className = "path-folder";
    rootSpan.textContent = "/";
    if (completeMode) {
      rootSpan.onclick = () => {
        setPagePath("/");
        reloadFilesRequest();
      };
    } else {
      rootSpan.classList.add("no-selection");
    }

    pathInfoDiv.appendChild(rootSpan);
    const rootSeparatorSpan = document.createElement("span");
    rootSeparatorSpan.className = "path-separator";
    rootSeparatorSpan.textContent = ">";
    pathInfoDiv.appendChild(rootSeparatorSpan);

    folders.forEach((folder, index) => {
      const folderSpan = document.createElement("span");
      folderSpan.className = "path-folder";
      folderSpan.textContent = folder;
      if (completeMode) {
        folderSpan.onclick = () => {
          setPagePath(getSubPaths(filepath)[index]);
          reloadFilesRequest();
        };
      } else {
        folderSpan.classList.add("no-selection");
      }
      pathInfoDiv.appendChild(folderSpan);

      const separatorSpan = document.createElement("span");
      separatorSpan.className = "path-separator";
      separatorSpan.textContent = ">";
      pathInfoDiv.appendChild(separatorSpan);
    });
  }

  if ((filepath != "/" && filepath != "") || pathNotFound)
    containerDiv.appendChild(returnDiv);
  containerDiv.appendChild(pathInfoDiv);

  return containerDiv;
}

function formatFileSize(bytes) {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return `0 ${sizes[0]}`;
  let i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
  let fileSize = bytes / Math.pow(1024, i);
  return fileSize.toFixed(2) + " " + sizes[i];
}

function generateFilesHTML(filesJson) {
  const filesList = filesJson["files"];
  let fileList = [];

  filesList.forEach((element, index) => {
    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";

    if (element["file"]) {
      const nameSpan = document.createElement("span");
      nameSpan.className = "file-name add-file-icon";
      nameSpan.innerHTML = element["name"];

      const sizeSpan = document.createElement("span");
      sizeSpan.className = "file-size";
      sizeSpan.innerHTML = formatFileSize(element["size"]);

      const dateSpan = document.createElement("span");
      dateSpan.className = "file-date";
      dateSpan.innerHTML = element["creation_date"];

      fileInfo.appendChild(nameSpan);
      fileInfo.appendChild(sizeSpan);
      fileInfo.appendChild(dateSpan);
    } else {
      const nameSpan = document.createElement("span");
      nameSpan.className = "file-name add-folder-icon folder-clickable";
      nameSpan.innerHTML = element["name"];
      nameSpan.onclick = () => {
        setPagePath(element["path"]);
        reloadFilesRequest();
      };

      const dateSpan = document.createElement("span");
      dateSpan.className = "file-date";
      dateSpan.innerHTML = element["creation_date"];

      fileInfo.appendChild(nameSpan);
      fileInfo.appendChild(dateSpan);
    }

    const fileButtons = document.createElement("div");
    fileButtons.className = "file-actions";
    const fileDropdown = document.createElement("div");
    fileDropdown.className = "file-actions-dropdown-element";
    const fileDropdownButtonContainer = document.createElement("div");
    fileDropdownButtonContainer.className = "file-actions-dropdown-open";

    // Download

    const downloadButton = document.createElement("button");
    downloadButton.className = "file-action-button";
    downloadButton.ariaLabel = "Download";

    downloadButton.onclick = () => {
      downloadFile(element["path"]);
    };

    const downloadIcon = document.createElement("i");
    downloadIcon.className = "fa fa-download";

    downloadButton.appendChild(downloadIcon);

    const downloadButtonClone = downloadButton.cloneNode(true);
    downloadButtonClone.onclick = () => {
      downloadFile(element["path"]);
    };

    // Edit

    const renameButton = document.createElement("button");
    renameButton.className = "file-action-button";
    renameButton.ariaLabel = "Rinomina";

    function renameButtonClick() {
      const modal = document.getElementById("file-rename-modal");
      const modalTitle = document.getElementById("file-rename-title");
      const renameInput = document.getElementById("file-rename-input");
      const closeButton = document.getElementById("file-rename-close");
      const saveButton = document.getElementById("file-rename-save");
      const errorElement = document.getElementById("file-rename-error");

      modalTitle.innerHTML = element["file"]
        ? "Rinomina file"
        : "Rinomina cartella";
      renameInput.placeholder = element["name"];
      renameInput.value = element["name"];

      renameInput.addEventListener("input", () => {
        renameInput.value = renameInput.value.replace(
          /[^a-zA-Z0-9àèìòùÀÈÌÒÙáéíóúÁÉÍÓÚäëïöüÄËÏÖÜ._\-+@& ]/g,
          "_"
        );
        errorElement.style.display = "none";
      });

      errorElement.style.display = "none";

      modal.onclick = (event) => {
        if (event.target === modal) {
          modal.style.display = "none";
        }
      };
      closeButton.onclick = () => {
        modal.style.display = "none";
      };

      saveButton.onclick = async () => {
        const elementDividedPath = element["path"].split("/");
        elementDividedPath[elementDividedPath.length - 1] = renameInput.value
          ? renameInput.value
          : element["name"];
        const newPath = elementDividedPath.join("/");

        const connectionResponse = await reformatRequest(
          element["path"],
          newPath
        );

        if (connectionResponse.ok) {
          modal.style.display = "none";
          reloadFilesRequest();
        } else {
          try {
            const responseJSON = await connectionResponse.json();
            const responseType = responseJSON["type"];

            switch (responseType) {
              case 1:
                errorElement.innerHTML = "Errore durante la richiesta";
                break;
              case 2:
                errorElement.innerHTML = "File non trovato";
                break;
              case 3:
                errorElement.innerHTML =
                  "Elemento con stesso nome già presente";
                break;
              default:
                errorElement.innerHTML = "Errore del server";
                break;
            }

            errorElement.style.display = "block";
          } catch (error) {
            alert(`Si è verificato un problema: ${error.message}`);
            window.location.reload();
          }
        }
      };

      modal.style.display = "flex";
    }

    renameButton.onclick = renameButtonClick;

    const renameIcon = document.createElement("i");
    renameIcon.className = "fa fa-edit";

    renameButton.appendChild(renameIcon);

    const renameButtonClone = renameButton.cloneNode(true);
    renameButtonClone.onclick = renameButtonClick;

    // Delete

    const deleteButton = document.createElement("button");
    deleteButton.className = "file-action-button";
    deleteButton.ariaLabel = "Elimina";

    function deleteButtonClick() {
      const modal = document.getElementById("delete-file-modal");
      const modalTitle = document.getElementById("delete-file-title");
      const closeButton = document.getElementById("delete-file-close");
      const saveButton = document.getElementById("delete-file-save");
      const cancelButton = document.getElementById("delete-file-cancel");
      const deleteName = document.getElementById("delete-file-name");

      modalTitle.innerHTML = element["file"]
        ? "Elimina file"
        : "Elimina cartella";

      deleteName.innerHTML = element["name"];

      modal.onclick = (event) => {
        if (event.target === modal) {
          modal.style.display = "none";
        }
      };
      closeButton.onclick = () => {
        modal.style.display = "none";
      };
      cancelButton.onclick = () => {
        modal.style.display = "none";
      };

      saveButton.onclick = async () => {
        await deleteElement(element["path"]);

        modal.style.display = "none";
        reloadFilesRequest();
      };

      modal.style.display = "flex";
    }

    deleteButton.onclick = deleteButtonClick;

    const deleteIcon = document.createElement("i");
    deleteIcon.className = "fa fa-trash";

    deleteButton.appendChild(deleteIcon);

    const deleteButtonClone = deleteButton.cloneNode(true);
    deleteButtonClone.onclick = deleteButtonClick;

    // Dropdown open button

    const openDropdown = document.createElement("button");
    openDropdown.className = "file-action-button";
    openDropdown.ariaLabel = "Menu";

    const openDropdownIcon = document.createElement("i");
    openDropdownIcon.className = "fa fa-bars";

    openDropdown.appendChild(openDropdownIcon);

    fileButtons.appendChild(downloadButton);
    fileButtons.appendChild(renameButton);
    fileButtons.appendChild(deleteButton);
    fileDropdown.appendChild(downloadButtonClone);
    fileDropdown.appendChild(renameButtonClone);
    fileDropdown.appendChild(deleteButtonClone);

    openDropdown.onclick = () => {
      if (fileDropdown.classList.contains("show")) {
        fileDropdown.classList.remove("show");
        openDropdown.classList.remove("show");
      } else {
        fileDropdown.classList.add("show");
        openDropdown.classList.add("show");
      }

      const openButtonRect = openDropdown.getBoundingClientRect();

      if (fileDropdown.classList.contains("show")) {
        if (index >= filesList.length - 1)
          fileDropdown.style.top = `${openButtonRect.bottom - 50}px`;
        else fileDropdown.style.top = `${openButtonRect.bottom}px`;
        fileDropdown.style.left = `${openButtonRect.left - 0.875}px`;
      }
    };

    function resetDropdownVisibility(event) {
      if (
        !fileDropdown.contains(event.target) &&
        !openDropdown.contains(event.target)
      ) {
        fileDropdown.classList.remove("show");
        openDropdown.classList.remove("show");
      }
    }

    document.addEventListener("click", resetDropdownVisibility);
    window.addEventListener("resize", () => {
      fileDropdown.classList.remove("show");
      openDropdown.classList.remove("show");
    });

    fileDropdownButtonContainer.appendChild(openDropdown);

    const fileContainer = document.createElement("div");
    fileContainer.className = "file-container";

    fileContainer.appendChild(fileInfo);
    fileContainer.appendChild(fileButtons);
    fileContainer.appendChild(fileDropdownButtonContainer);
    fileContainer.appendChild(fileDropdown);

    fileList.push(fileContainer);
  });

  return fileList;
}

function reloadFiles(filesJson, filepath, folderNotFound) {
  main_files_div = document.getElementById("main-files-div");

  // Add filepath

  const titlePath = generateFilePathHTML(filepath, folderNotFound, true);

  if (folderNotFound) {
    main_files_div.innerHTML = "";
    main_files_div.appendChild(titlePath);
    return;
  }

  // Add file list

  const filesList = generateFilesHTML(filesJson);

  main_files_div.innerHTML = "";
  main_files_div.appendChild(titlePath);
  filesList.forEach((element, index) => {
    main_files_div.appendChild(element);
  });
}

let filesToProcessList = [];
let currentFileID = 1;

async function uploadFilesFromListRecursive() {
  while (true) {
    const elementToProcess = filesToProcessList.find(
      (item) =>
        !item.waitingfor &&
        !item.alreadydone &&
        !item.replaceerror &&
        !item.storageerror
    );

    if (!elementToProcess) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    await updateUploadElement(elementToProcess);
  }
}

function removeFilesElementById(id) {
  const index = filesToProcessList.findIndex((item) => item.id === id);
  if (index > -1) {
    filesToProcessList.splice(index, 1);
  }
}

function resetDoneFiles() {
  filesToProcessList = filesToProcessList.filter(
    (file) => !(file.alreadydone || file.replaceerror || file.storageerror)
  );
}

async function updateUploadElement(elementToProcess) {
  const container = elementToProcess.container;
  const fileToSend = elementToProcess.file;

  // Checking file hash would be too slow for large files, just upload it.

  const formData = new FormData();
  formData.append("file", fileToSend);
  const path = elementToProcess.path;

  const uploadPromise = new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `/upload/file?path=${encodeURIComponent(path)}`, true);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setLoadingFilePercentage(container, percentComplete);
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText);
        setLoadingFileComplete(container);

        elementToProcess.alreadydone = true;
        reloadFilesRequest();

        resolve(result);
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error"));
    };

    xhr.send(formData);
  });

  try {
    await uploadPromise;
  } catch (error) {
    alert("Error uploading file");
    window.location.reload();
  }
}

function removeButtonFromReplaceContainer(container) {
  const containerElements = container.children;
  for (let i = containerElements.length - 1; i >= 0; i--) {
    const el = containerElements[i];
    if (el.id === "replace-file-button" || el.id === "cancel-file-button") {
      container.removeChild(el);
    }
  }
}

function documentDisplayFileList() {
  const filesDIVelement = document.getElementById("new-files-uploading-list");
  filesDIVelement.innerHTML = "";

  for (const file of filesToProcessList) {
    removeButtonFromReplaceContainer(file.container);

    if (file.waitingfor || file.replaceerror) {
      const cancelButton = document.createElement("button");
      cancelButton.className = "file-action-button cancel-files-colored";
      cancelButton.id = "cancel-file-button";
      cancelButton.ariaLabel = "Annulla";

      cancelButton.onclick = () => {
        removeFilesElementById(file.id);
        checkTotalReplaceButton();
        documentDisplayFileList();
      };

      const cancelIcon = document.createElement("i");
      cancelIcon.className = "fa-solid fa-xmark";

      cancelButton.appendChild(cancelIcon);
      file.container.appendChild(cancelButton);
    }
    if (file.waitingfor) {
      const reloadButton = document.createElement("button");
      reloadButton.className = "file-action-button replace-files-colored";
      reloadButton.id = "replace-file-button";
      reloadButton.ariaLabel = "Sovrascrivi";

      reloadButton.onclick = () => {
        const index = filesToProcessList.findIndex(
          (item) => item.id === file.id
        );
        filesToProcessList[index].waitingfor = false;
        removeButtonFromReplaceContainer(filesToProcessList[index].container);

        checkTotalReplaceButton();
      };

      const reloadIcon = document.createElement("i");
      reloadIcon.className = "fa fa-rotate-right";

      reloadButton.appendChild(reloadIcon);
      file.container.appendChild(reloadButton);
    }

    filesDIVelement.appendChild(file.container);
  }
}

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

function uploadButtons(filepath) {
  const buttonsContainer = document.getElementById("upload-buttons-container");

  const uploadFileButton = document.createElement("button");
  const newFolderButton = document.createElement("button");
  uploadFileButton.className = "upload-file";
  newFolderButton.className = "upload-folder";

  uploadFileButton.onclick = () => {
    const modal = document.getElementById("upload-file-modal");
    const closeButton = document.getElementById("upload-file-close");
    const cancelButton = document.getElementById("upload-file-cancel");
    const pathbar = document.getElementById("upload-file-pathbar");

    // Generate path bar

    const titlePath = generateFilePathHTML(filepath, false, false);
    titlePath.id = "upload-file-pathbar";

    pathbar.parentNode.replaceChild(titlePath, pathbar);

    // File select buttons

    const uploadFileSelectButton = document.getElementById(
      "file-selection-input-button"
    );
    const uploadFolderSelectButton = document.getElementById(
      "folder-selection-input-button"
    );

    checkTotalReplaceButton();

    const uploadFileSelect = document.createElement("input");
    uploadFileSelect.type = "file";
    uploadFileSelect.id = "file-selection-input";
    uploadFileSelect.style.display = "none";
    uploadFileSelect.multiple = true;

    const uploadFolderSelect = document.createElement("input");
    uploadFolderSelect.type = "file";
    uploadFolderSelect.id = "folder-selection-input";
    uploadFolderSelect.style.display = "none";
    uploadFolderSelect.webkitdirectory = true;

    const oldUploadFileSelect = document.getElementById("file-selection-input");
    const oldUploadFolderSelect = document.getElementById(
      "folder-selection-input"
    );

    // Replace to prevent eventListeners accumulating

    oldUploadFileSelect.parentNode.replaceChild(
      uploadFileSelect,
      oldUploadFileSelect
    );
    oldUploadFolderSelect.parentNode.replaceChild(
      uploadFolderSelect,
      oldUploadFolderSelect
    );

    uploadFileSelectButton.onclick = () => uploadFileSelect.click();
    uploadFolderSelectButton.onclick = () => uploadFolderSelect.click();

    resetDoneFiles();
    documentDisplayFileList();

    const onFileSelect = async function (event) {
      const files = event.target.files;

      let queryData = [];
      let tempFilesToProcessList = [];

      let size = 0;

      for (const singleFile of files) {
        const fileContainerDiv = document.createElement("div");
        fileContainerDiv.className = "file-container modal-upload";

        const fileTitleDiv = document.createElement("div");
        fileTitleDiv.className = "file-name add-file-icon no-margin";
        fileTitleDiv.innerHTML = singleFile.name;

        fileContainerDiv.appendChild(fileTitleDiv);

        const newFileElement = {
          id: currentFileID++,
          path: filepath,
          file: singleFile,
          waitingfor: false,
          wasreplaced: false,
          replaceerror: false,
          alreadydone: false,
          storageerror: false,
          container: fileContainerDiv,
        };

        let completePath;

        if (
          singleFile.webkitRelativePath &&
          singleFile.webkitRelativePath !== ""
        )
          completePath =
            filepath.replace(/^\/+/, "") + "/" + singleFile.webkitRelativePath;
        else
          completePath = filepath.replace(/^\/+/, "") + "/" + singleFile.name;

        queryData.push({
          id: newFileElement.id,
          filepath: completePath,
        });
        size += singleFile.size;

        tempFilesToProcessList.push(newFileElement);
      }

      const response = await getAvailableFiles({ data: queryData, size: size });

      try {
        if (response.ok) {
          const responseJSON = await response.json();

          if (responseJSON["storageError"]) {
            const storageErrorDiv = document.createElement("div");
            storageErrorDiv.className =
              "file-container modal-upload transparent-red";

            const fileTitleDiv = document.createElement("div");
            fileTitleDiv.className =
              "file-name storageerror add-error-icon no-margin";
            fileTitleDiv.innerHTML = "Memoria esaurita";

            storageErrorDiv.appendChild(fileTitleDiv);

            tempFilesToProcessList = [
              {
                id: currentFileID++,
                file: null,
                waitingfor: false,
                wasreplaced: false,
                replaceerror: true,
                alreadydone: false,
                storageerror: true,
                container: storageErrorDiv,
              },
            ];
          } else {
            const replacedFileList = responseJSON["responseJSON"];

            for (const replacedFile of replacedFileList) {
              const id = replacedFile.id;
              const isFile = replacedFile.isfile;
              const isFolder = replacedFile.isfolder;

              const listElement = tempFilesToProcessList.find(
                (item) => item.id === id
              );

              if (isFile) {
                listElement.waitingfor = true;
                listElement.wasreplaced = true;
                listElement.container.classList.add("yellow-transparent-bg");
              } else if (isFolder) {
                listElement.replaceerror = true;
                listElement.container.classList.add("red-transparent-bg");
              }
            }
          }
        } else {
          alert("Errore durante la preparazione al caricamento dei file");
          window.location.reload();
        }
      } catch (error) {
        alert(
          "Errore durante la preparazione al caricamento dei file: " +
            error.message
        );
        window.location.reload();
      }

      filesToProcessList = filesToProcessList.concat(tempFilesToProcessList);

      documentDisplayFileList();
      checkTotalReplaceButton();
    };

    uploadFileSelect.addEventListener("change", onFileSelect);
    uploadFolderSelect.addEventListener("change", onFileSelect);

    // Modal window

    modal.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    };
    closeButton.onclick = () => {
      modal.style.display = "none";
    };
    cancelButton.onclick = () => {
      modal.style.display = "none";
    };

    modal.style.display = "flex";
  };

  newFolderButton.onclick = () => {
    const modal = document.getElementById("folder-create-modal");
    const newNameInput = document.getElementById("folder-create-input");
    const closeButton = document.getElementById("folder-create-close");
    const saveButton = document.getElementById("folder-create-save");
    const errorMessage = document.getElementById("folder-create-error");

    errorMessage.style.display = "none";

    modal.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    };
    closeButton.onclick = () => {
      modal.style.display = "none";
    };

    newNameInput.addEventListener("input", () => {
      newNameInput.value = newNameInput.value.replace(
        /[^a-zA-Z0-9àèìòùÀÈÌÒÙáéíóúÁÉÍÓÚäëïöüÄËÏÖÜ._\-+@& ]/g,
        "_"
      );
      errorMessage.style.display = "none";
    });

    newNameInput.value = "";

    saveButton.onclick = async () => {
      const response = await createFolder(filepath, newNameInput.value);

      if (response.ok) {
        modal.style.display = "none";
        reloadFilesRequest();
      } else {
        try {
          const responseJSON = await response.json();
          const responseType = responseJSON["type"];

          switch (responseType) {
            case 1:
              errorMessage.innerHTML = "Nome cartella non valido";
              break;
            case 2:
              errorMessage.innerHTML = "Cartella già esistente";
              break;
            default:
              errorMessage.innerHTML = "Errore del server";
              break;
          }

          errorMessage.style.display = "block";
        } catch (error) {
          alert(`Si è verificato un problema: ${error.message}`);
          window.location.reload();
        }
      }
    };

    modal.style.display = "flex";
  };

  const fileIconContainer = document.createElement("span");
  fileIconContainer.className = "icon-container";
  const folderIconContainer = fileIconContainer.cloneNode(true);

  const fileIcon = document.createElement("i");
  const folderIcon = document.createElement("i");
  fileIcon.className = "fas fa-file-upload";
  folderIcon.className = "fas fa-folder-plus";
  fileIconContainer.appendChild(fileIcon);
  folderIconContainer.appendChild(folderIcon);

  const newFileNameSpan = document.createElement("span");
  const newFolderNameSpan = document.createElement("span");
  newFileNameSpan.innerHTML = "Carica file";
  newFolderNameSpan.innerHTML = "Crea cartella";

  uploadFileButton.appendChild(fileIconContainer);
  newFolderButton.appendChild(folderIconContainer);
  uploadFileButton.appendChild(newFileNameSpan);
  newFolderButton.appendChild(newFolderNameSpan);

  buttonsContainer.innerHTML = "";
  buttonsContainer.appendChild(uploadFileButton);
  buttonsContainer.appendChild(newFolderButton);
}

uploadFilesFromListRecursive();

window.onload = reloadFilesRequest;
window.onpopstate = reloadFilesRequest;
