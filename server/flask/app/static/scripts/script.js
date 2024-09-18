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

  tree_auto_scroll(); // Function from script in HTML
}

function generateFilePathHTML(filepath, pathNotFound) {
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

    const dividedFilepath = ["/"].concat(getSubPaths(filepath));

    returnButton.onclick = () => {
      setPagePath(dividedFilepath[dividedFilepath.length - 2]);
      reloadFilesRequest();
    };

    const returnIcon = document.createElement("i");
    returnIcon.className = "fa fa-level-up return-span";
    returnIcon.setAttribute("aria-hidden", "true");

    returnButton.appendChild(returnIcon);
    returnDiv.appendChild(returnButton);
  }

  const pathInfoDiv = document.createElement("div");
  pathInfoDiv.className = "file-path-info";

  if (pathNotFound) {
    const rootSeparatorSpan = document.createElement("span");
    rootSeparatorSpan.className = "path-separator error";
    rootSeparatorSpan.textContent = "Percorso non trovato";
    pathInfoDiv.appendChild(rootSeparatorSpan);
  } else {
    const rootSpan = document.createElement("span");
    rootSpan.className = "path-folder";
    rootSpan.textContent = "/";
    rootSpan.onclick = () => {
      setPagePath("/");
      reloadFilesRequest();
    };
    pathInfoDiv.appendChild(rootSpan);
    const rootSeparatorSpan = document.createElement("span");
    rootSeparatorSpan.className = "path-separator";
    rootSeparatorSpan.textContent = ">";
    pathInfoDiv.appendChild(rootSeparatorSpan);

    folders.forEach((folder, index) => {
      const folderSpan = document.createElement("span");
      folderSpan.className = "path-folder";
      folderSpan.textContent = folder;
      folderSpan.onclick = () => {
        setPagePath(getSubPaths(filepath)[index]);
        reloadFilesRequest();
      };
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
        console.log(element["path"]);
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

    const renameIcon = document.createElement("i");
    renameIcon.className = "fa fa-edit";

    renameButton.appendChild(renameIcon);

    const renameButtonClone = renameButton.cloneNode(true);

    // Delete

    const deleteButton = document.createElement("button");
    deleteButton.className = "file-action-button";
    deleteButton.ariaLabel = "Elimina";

    const deleteIcon = document.createElement("i");
    deleteIcon.className = "fa fa-trash";

    deleteButton.appendChild(deleteIcon);

    const deleteButtonClone = deleteButton.cloneNode(true);

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
        fileDropdown.style.top = `${openButtonRect.bottom}px`;
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

  const titlePath = generateFilePathHTML(filepath, folderNotFound);

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

window.onload = reloadFilesRequest;
window.onpopstate = reloadFilesRequest;