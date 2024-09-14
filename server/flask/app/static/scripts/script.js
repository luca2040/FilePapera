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

async function reloadFilesRequest() {
  filepath = checkPath();
  const url = `/list?path=${encodeURIComponent(filepath)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    const data = await response.json();
    reloadFiles(data, filepath, "not_found" in data);
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
  }
}

function generateFilePathHTML(filepath, pathNotFound) {
  var folders = [];

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

    returnButton.addEventListener("click", () => {
      window.history.back();
    });

    returnDiv.appendChild(returnButton);
  } else if (filepath != "/" && filepath != "") {
    const returnButton = document.createElement("button");
    returnButton.className = "upload-file file-path-return";

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
    pathInfoDiv.appendChild(rootSpan);
    const rootSeparatorSpan = document.createElement("span");
    rootSeparatorSpan.className = "path-separator";
    rootSeparatorSpan.textContent = ">";
    pathInfoDiv.appendChild(rootSeparatorSpan);

    folders.forEach((folder, index) => {
      const folderSpan = document.createElement("span");
      folderSpan.className = "path-folder";
      folderSpan.textContent = folder;
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
  if (bytes === 0) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]; // Maybe too much
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

function generateFilesHTML(filesJson) {
  const filesList = filesJson["files"];
  var fileList = [];

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

      const dateSpan = document.createElement("span");
      dateSpan.className = "file-date";
      dateSpan.innerHTML = element["creation_date"];

      fileInfo.appendChild(nameSpan);
      fileInfo.appendChild(dateSpan);
    }

    const fileButtons = document.createElement("div");
    fileButtons.className = "file-actions";

    // Download

    const downloadButton = document.createElement("button");
    downloadButton.className = "file-action-button";
    downloadButton.ariaLabel = "Download";

    const downloadIcon = document.createElement("i");
    downloadIcon.className = "fa fa-download";

    downloadButton.appendChild(downloadIcon);

    // Edit

    const renameButton = document.createElement("button");
    renameButton.className = "file-action-button";
    renameButton.ariaLabel = "Rinomina";

    const renameIcon = document.createElement("i");
    renameIcon.className = "fa fa-edit";

    renameButton.appendChild(renameIcon);

    // Delete

    const deleteButton = document.createElement("button");
    deleteButton.className = "file-action-button";
    deleteButton.ariaLabel = "Elimina";

    const deleteIcon = document.createElement("i");
    deleteIcon.className = "fa fa-trash";

    deleteButton.appendChild(deleteIcon);

    fileButtons.appendChild(downloadButton);
    fileButtons.appendChild(renameButton);
    fileButtons.appendChild(deleteButton);

    const fileContainer = document.createElement("div");
    fileContainer.className = "file-container";

    if (index === filesList.length - 1)
      fileContainer.classList.add("last-file");

    fileContainer.appendChild(fileInfo);
    fileContainer.appendChild(fileButtons);

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

  const filesList = generateFilesHTML(filesJson);

  main_files_div.innerHTML = "";
  main_files_div.appendChild(titlePath);
  filesList.forEach((element, index) => {
    main_files_div.appendChild(element);
  });
}

window.onload = reloadFilesRequest;
