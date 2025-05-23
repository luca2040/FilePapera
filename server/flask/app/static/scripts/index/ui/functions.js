// Returns the bytes given in a readable string with size
function formatFileSize(bytes) {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return `0 ${sizes[0]}`;
  let i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
  let fileSize = bytes / Math.pow(1024, i);
  return fileSize.toFixed(2) + "&nbsp;" + sizes[i];
}

// Updates the storage indicator bar with the current data, fetched from server
async function set_usage_bar() {
  const storage_json = await getStorage();

  if (!storage_json) return;

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

// Toggles sidebar active or not when called
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("active");
}

// Deactivates sidebar
function closeSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.remove("active");
}

// Updates the node structure in the html fetching the server
async function loadFolderStructure(parent, paths, index) {
  if (index === 0) {
    const rootNode = document.getElementById("root-node");
    rootNode.onclick = () => {
      setPagePath("/");
      reloadFilesRequest();
    };

    rootNode.ondragover = function (event) {
      event.preventDefault();
      event.stopPropagation();
      rootNode.classList.add("dragged-over");
    };

    rootNode.ondragleave = function (event) {
      rootNode.classList.remove("dragged-over");
    };

    rootNode.ondrop = async function (event) {
      event.preventDefault();
      event.stopPropagation();
      rootNode.classList.remove("dragged-over");

      const isFile = Array.from(event.dataTransfer.items).some(
        (item) => item.kind === "file"
      );

      if (isFile) await uploadFilesFromDragEvent(event, "/");
      else await moveSelectedTo("/");
    };

    if (paths.length <= 1) {
      rootNode.className = "node node-main current";
      return;
    } else rootNode.className = "node node-main current-less";
  }

  if (index >= paths.length) return;

  let fileListJson = await loadFileList(paths[index]);

  if (!fileListJson) fileListJson = [];
  else fileListJson = fileListJson["files"];

  for (const element of fileListJson) {
    if (!element["file"]) {
      const elementContainer = document.createElement("li");
      const node = document.createElement("div");
      node.className = "node";
      node.onclick = () => {
        setPagePath(element["path"]);
        reloadFilesRequest();
      };

      node.ondragover = function (event) {
        event.preventDefault();
        event.stopPropagation();
        node.classList.add("dragged-over");
      };

      node.ondragleave = function (event) {
        node.classList.remove("dragged-over");
      };

      node.ondrop = async function (event) {
        event.preventDefault();
        event.stopPropagation();
        node.classList.remove("dragged-over");

        const isFile = Array.from(event.dataTransfer.items).some(
          (item) => item.kind === "file"
        );

        if (isFile) await uploadFilesFromDragEvent(event, element["path"]);
        else await moveSelectedTo(element["path"]);
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

// Returns the html element for the file path bar
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
    returnButton.className = "upload-file file-path-return no-margin-bottom";
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
    returnButton.className = "upload-file file-path-return no-margin-bottom";
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
  pathInfoDiv.className = "file-path-info no-text-select";

  if (!completeMode) pathInfoDiv.classList.add("dark");
  else pathInfoDiv.classList.add("no-margin-bottom");

  if (pathNotFound) {
    const rootSeparatorSpan = document.createElement("span");
    rootSeparatorSpan.className = "path-separator error";
    rootSeparatorSpan.textContent = TRANSLATIONS.path_not_found;
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

      rootSpan.ondragover = function (event) {
        event.preventDefault();
        event.stopPropagation();
        rootSpan.classList.add("dragged-over");
      };

      rootSpan.ondragleave = function (event) {
        rootSpan.classList.remove("dragged-over");
      };

      rootSpan.ondrop = async function (event) {
        event.preventDefault();
        event.stopPropagation();
        rootSpan.classList.remove("dragged-over");

        const isFile = Array.from(event.dataTransfer.items).some(
          (item) => item.kind === "file"
        );

        if (isFile) await uploadFilesFromDragEvent(event, "/");
        else await moveSelectedTo("/");
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

        folderSpan.ondragover = function (event) {
          event.preventDefault();
          event.stopPropagation();
          folderSpan.classList.add("dragged-over");
        };

        folderSpan.ondragleave = function (event) {
          folderSpan.classList.remove("dragged-over");
        };

        folderSpan.ondrop = async function (event) {
          event.preventDefault();
          event.stopPropagation();
          folderSpan.classList.remove("dragged-over");

          const isFile = Array.from(event.dataTransfer.items).some(
            (item) => item.kind === "file"
          );

          if (isFile)
            await uploadFilesFromDragEvent(event, getSubPaths(filepath)[index]);
          else await moveSelectedTo(getSubPaths(filepath)[index]);
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

// Animates the change in the sort text
function changeSortText(newText) {
  const span = document.getElementById("sort-value-text");

  span.classList.add("animate-out");

  setTimeout(() => {
    span.textContent = newText;

    span.classList.remove("animate-out");
    span.classList.add("animate-in");

    setTimeout(() => {
      span.classList.remove("animate-in");
    }, 150); // Same time as css
  }, 150); // Same time as css
}

// Returns the html element for the sort button after the path bar
function generateSortButtonHTML() {
  const containerDiv = document.createElement("div");
  containerDiv.className = "sort-button-container";

  const sortButton = document.createElement("button");
  sortButton.className = "upload-file sort-button margined-right";

  const sortTag = document.createElement("span");
  sortTag.className = "sort-span";
  sortTag.innerText = TRANSLATIONS.sort_by;

  const fileviewOrder = getFileViewOrder();
  const actualSort = fileviewOrder.sort;
  const actualOrder = fileviewOrder.order;

  // Possible options:
  const sortPossibilities = [
    TRANSLATIONS.sort_name, // 0: sort by name
    TRANSLATIONS.sort_date, // 1: sort by date
    TRANSLATIONS.sort_size // 2: sort by size
  ];

  const sortValue = document.createElement("span");
  sortValue.className = "sort-span value";
  sortValue.id = "sort-value-text";
  sortValue.innerText = sortPossibilities[actualSort];

  sortButton.onclick = () => {
    const fileOrderResult = getFileViewOrder();
    var sortBy_local = fileOrderResult.sort;
    var viewOrder_local = fileOrderResult.order;

    sortBy_local++;
    if (sortBy_local >= sortPossibilities.length) sortBy_local = 0;

    changeSortText(sortPossibilities[sortBy_local]);

    setFileViewOrder(sortBy_local, viewOrder_local);
    reloadFilesViewedOrder();
  };

  sortButton.appendChild(sortTag);
  sortButton.appendChild(sortValue);

  const orderButton = document.createElement("button");
  orderButton.className = "upload-file sort-button";

  const orderIcon = document.createElement("i");
  orderIcon.className = "fa-solid fa-arrow-up transition-transform";

  orderButton.style.transform = actualOrder ? "" : "rotate(180deg)";

  orderButton.onclick = () => {
    const fileOrderResult = getFileViewOrder();
    var sortBy_local = fileOrderResult.sort;
    var viewOrder_local = fileOrderResult.order;

    viewOrder_local = !viewOrder_local;
    orderButton.style.transform = viewOrder_local ? "" : "rotate(180deg)";

    setFileViewOrder(sortBy_local, viewOrder_local);
    reloadFilesViewedOrder();
  };

  orderButton.appendChild(orderIcon);

  containerDiv.appendChild(sortButton);
  containerDiv.appendChild(orderButton);

  return containerDiv;
}

// Reload the files viewed sorting them
function reloadFilesViewedOrder() {
  const htmlFilesContainer = document.getElementById("all-files-container");
  const filesList = Array.from(htmlFilesContainer.children);
  const sortedFilesList = sortFilesListBySetSort(filesList);

  while (htmlFilesContainer.firstChild) {
    htmlFilesContainer.removeChild(htmlFilesContainer.firstChild);
  }

  sortedFilesList.forEach((element, index) => {
    htmlFilesContainer.appendChild(element);
  });
}

// Sort the file list given by the current files sort parameters
function sortFilesListBySetSort(filesList) {
  // Get current sort parameters
  const fileviewOrder = getFileViewOrder();
  const actualSort = fileviewOrder.sort;
  const actualOrder = fileviewOrder.order;

  // actualSort options:
  // 0: sort by name
  // 1: sort by date
  // 2: sort by size

  // actualOrder options:
  // false: normal
  // true: reversed

  let files = [];
  let folders = [];

  filesList.forEach((element, index) => {
    ((element.getAttribute("isfile") === "true") ? files : folders).push(element);
  });

  switch (actualSort) {
    case 0:
      files = sortElementsList(files, 0, actualOrder);
      folders = sortElementsList(folders, 0, actualOrder);
      break;
    case 1:
      files = sortElementsList(files, 1, actualOrder);
      folders = sortElementsList(folders, 1, actualOrder);
      break;
    case 2:
      files = sortElementsList(files, 2, actualOrder);
      folders = sortElementsList(folders, 0, false); // folders by name because they dont have size
      break;
  }

  // If sorting from size show files before for the same reason as before
  let finalList = (actualSort == 2) ? files.concat(folders) : folders.concat(files);

  finalList.forEach((element, index) => {
    element.setAttribute("index", index);
  });

  return finalList;
}

// Sort elements:
// 0: by name
// 1: by date
// 2: by size
function sortElementsList(elements, type, reversed) {
  return elements.sort((a, b) => {
    let valueA, valueB;

    switch (type) {
      case 0:
        valueA = a.getAttribute("filename")?.toLowerCase() || "";
        valueB = b.getAttribute("filename")?.toLowerCase() || "";
        break;
      case 1:
        valueA = parseInt(a.getAttribute("filedate"), 10) || 0;
        valueB = parseInt(b.getAttribute("filedate"), 10) || 0;
        break;
      case 2:
        valueA = parseInt(a.getAttribute("filesize"), 10) || 0;
        valueB = parseInt(b.getAttribute("filesize"), 10) || 0;
        break;
      default:
        return 0;
    }

    if (valueA < valueB) return reversed ? 1 : -1;
    if (valueA > valueB) return reversed ? -1 : 1;
    if (type == 0) return 0;

    // If not sortable like that because they are the same then default to name order, always not reversed

    valueA = a.getAttribute("filename")?.toLowerCase() || "";
    valueB = b.getAttribute("filename")?.toLowerCase() || "";

    if (valueA < valueB) return -1;
    if (valueA > valueB) return 1;
    return 0;
  });
}

// Returns a list of html elements, for each one of the file/folder elements in main ui, including their download/rename/delete buttons
function generateFilesHTML(filesJson) {
  const filesList = filesJson["files"];
  let fileList = [];

  filesList.forEach((element, index) => {
    const fileContainer = document.createElement("div");
    fileContainer.className = "file-container nopadding";

    fileContainer.setAttribute("index", index);
    fileContainer.setAttribute("filepath", element["path"]);
    fileContainer.setAttribute("filename", element["name"]);
    fileContainer.setAttribute("filedate", element["sort_date"]);
    fileContainer.setAttribute("filesize", element["size"]);
    fileContainer.setAttribute("isfile", element["file"]);

    fileContainer.draggable = true;

    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info vertical-center";

    const noTouchOnclick = (event) => {
      if (event.ctrlKey) {

        if (fileContainer.hasAttribute("selected"))
          toggleSelected(fileContainer, false);
        else toggleSelected(fileContainer, true);

      } else if (event.shiftKey) {
        let filesElements = document
          .getElementById("all-files-container")
          .querySelectorAll(".file-container");

        let lastElementIndex = -1;
        let firstElementIndex = -1;
        filesElements.forEach((element) => {
          let elementIndex = parseInt(element.getAttribute("index"), 10);

          if (element.hasAttribute("selected")) {
            if (firstElementIndex === -1) {
              firstElementIndex = elementIndex;
            }
            lastElementIndex = elementIndex;
          }
        });

        const index_dynamic = parseInt(fileContainer.getAttribute("index"), 10);;

        if (
          lastElementIndex !== -1 &&
          lastElementIndex !== index_dynamic &&
          firstElementIndex !== index_dynamic
        ) {
          filesElements.forEach((element) => {
            let elementIndex = parseInt(element.getAttribute("index"), 10);

            if (index_dynamic > lastElementIndex) {
              if (elementIndex >= lastElementIndex && elementIndex <= index_dynamic) {
                element.setAttribute("selected", "");
              }
            } else {
              if (elementIndex <= firstElementIndex && elementIndex >= index_dynamic) {
                element.setAttribute("selected", "");
              }
            }
          });
        }
      } else {
        deselectAll();
        toggleSelected(fileContainer, true);
      }
    };

    if (element["file"]) {
      const nameSpan = document.createElement("span");
      nameSpan.className = "file-name no-text-select add-file-icon filemargin";
      nameSpan.innerHTML = element["name"];

      const fileExtensionParts = element["name"].split(".");
      const fileExtension =
        fileExtensionParts.length > 1 ? fileExtensionParts.pop() : "";

      const clickFunc = handleFileOpenExtension(
        fileInfo,
        fileExtension,
        element["size"],
        element["path"],
        element["name"]
      );

      if (isTouchDevice()) {
        fileInfo.onclick = clickFunc;
      } else {
        fileInfo.onclick = noTouchOnclick;
        fileInfo.ondblclick = clickFunc;
      }

      const sizeSpan = document.createElement("span");
      sizeSpan.className = "file-size no-text-select";
      sizeSpan.innerHTML = formatFileSize(element["size"]);

      const dateSpan = document.createElement("span");
      dateSpan.className = "file-date no-text-select";
      dateSpan.innerHTML = element["creation_date"];

      fileInfo.appendChild(nameSpan);
      fileInfo.appendChild(sizeSpan);
      fileInfo.appendChild(dateSpan);
    } else {
      const nameSpan = document.createElement("span");
      nameSpan.className =
        "file-name no-text-select add-folder-icon filemargin";
      nameSpan.innerHTML = element["name"];

      const clickFunc = () => {
        setPagePath(element["path"]);
        reloadFilesRequest();
      };

      if (isTouchDevice()) {
        fileInfo.onclick = clickFunc;
      } else {
        fileInfo.onclick = noTouchOnclick;
        fileInfo.ondblclick = clickFunc;
      }

      const dateSpan = document.createElement("span");
      dateSpan.className = "file-date no-text-select";
      dateSpan.innerHTML = element["creation_date"];

      fileInfo.appendChild(nameSpan);
      fileInfo.appendChild(dateSpan);

      fileInfo.ondragover = function (event) {
        if (!fileContainer.hasAttribute("selected")) {
          event.preventDefault();
          event.stopPropagation();
          fileContainer.classList.add("dragged-over");
        }
      };

      fileInfo.ondragleave = function (event) {
        if (!fileContainer.hasAttribute("selected")) {
          fileContainer.classList.remove("dragged-over");
        }
      };

      fileInfo.ondrop = async function (event) {
        event.preventDefault();
        event.stopPropagation();
        fileContainer.classList.remove("dragged-over");

        const isFile = Array.from(event.dataTransfer.items).some(
          (item) => item.kind === "file"
        );

        if (isFile) await uploadFilesFromDragEvent(event, element["path"]);
        else {
          const selectedElements = getCurrentlySelectedElements(true);
          if (!selectedElements.includes(fileContainer)) await moveSelectedTo(element["path"]);
        }
      };
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
    downloadButton.ariaLabel = TRANSLATIONS.download_label;

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

    // Rename

    const renameButton = document.createElement("button");
    renameButton.className = "file-action-button";
    renameButton.ariaLabel = TRANSLATIONS.rename_label;

    function renameButtonClick() {
      const modal = document.getElementById("file-rename-modal");
      const modalTitle = document.getElementById("file-rename-title");
      const renameInput = document.getElementById("file-rename-input");
      const closeButton = document.getElementById("file-rename-close");
      const saveButton = document.getElementById("file-rename-save");
      const errorElement = document.getElementById("file-rename-error");

      modalTitle.innerHTML = element["file"]
        ? TRANSLATIONS.rename_file
        : TRANSLATIONS.rename_folder;
      renameInput.placeholder = element["name"];
      renameInput.value = element["name"];

      const onSaveClicked = async () => {
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
          closeModal();
          reloadFilesRequest();
        } else {
          try {
            const responseJSON = await connectionResponse.json();
            const responseType = responseJSON["type"];

            switch (responseType) {
              case 1:
                errorElement.innerHTML = TRANSLATIONS.error_during_request;
                break;
              case 2:
                errorElement.innerHTML = TRANSLATIONS.file_not_found;
                break;
              case 3:
                errorElement.innerHTML = TRANSLATIONS.element_already_named;
                break;
              default:
                errorElement.innerHTML = TRANSLATIONS.server_error;
                break;
            }

            errorElement.style.display = "block";
          } catch (error) {
            alert(`${TRANSLATIONS.problem_occurred} ${error.message}`);
            window.location.reload();
          }
        }
      };

      renameInput.oninput = () => {
        renameInput.value = renameInput.value.replace(
          /[^a-zA-Z0-9àèìòùÀÈÌÒÙáéíóúÁÉÍÓÚäëïöüÄËÏÖÜ._\-+@& ]/g,
          "_"
        );
        errorElement.style.display = "none";
      };

      renameInput.onkeydown = (event) => {
        if (event.key === 'Enter') {
          onSaveClicked();
        }
      };

      errorElement.style.display = "none";

      const closeModal = () => {
        toggleLinkAttribute("modalOpen", false);
        modal.style.display = "none";
      };

      modal.onclick = (event) => {
        if (event.target === modal) {
          closeModal();
        }
      };
      closeButton.onclick = () => {
        closeModal();
      };

      saveButton.onclick = () => {
        onSaveClicked();
      }

      toggleLinkAttribute("modalOpen", true);
      modal.style.display = "flex";

      renameInput.focus();
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
    deleteButton.ariaLabel = TRANSLATIONS.delete_label;

    function deleteButtonClick() {
      const modal = document.getElementById("delete-file-modal");
      const modalTitle = document.getElementById("delete-file-title");
      const closeButton = document.getElementById("delete-file-close");
      const saveButton = document.getElementById("delete-file-save");
      const cancelButton = document.getElementById("delete-file-cancel");
      const deleteName = document.getElementById("delete-file-name");

      modalTitle.innerHTML = element["file"]
        ? TRANSLATIONS.delete_file
        : TRANSLATIONS.delete_folder;

      const nameTag = document.createElement("div");
      nameTag.className = "file-container modal-upload";
      nameTag.innerHTML = element["name"];

      deleteName.innerHTML = "";
      deleteName.appendChild(nameTag);

      cancelButton.style.display = "inline-block";

      const closeModal = () => {
        toggleLinkAttribute("modalOpen", false);
        modal.style.display = "none";
      };

      modal.onclick = (event) => {
        if (event.target === modal) closeModal();
      };
      closeButton.onclick = () => {
        closeModal();
      };
      cancelButton.onclick = () => {
        closeModal();
      };

      saveButton.onclick = async () => {
        await deleteElement(element["path"]);

        closeModal();
        reloadFilesRequest();
      };

      toggleLinkAttribute("modalOpen", true);
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
    openDropdown.ariaLabel = TRANSLATIONS.menu_label;

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

    fileContainer.appendChild(fileInfo);
    fileContainer.appendChild(fileButtons);
    fileContainer.appendChild(fileDropdownButtonContainer);
    fileContainer.appendChild(fileDropdown);

    fileList.push(fileContainer);
  });

  return fileList;
}

// Updates the main ui getting the new elements for path bar and file/folder elements
function reloadFiles(filesJson, filepath, folderNotFound) {
  main_files_div = document.getElementById("main-files-div");

  // Add filepath

  const titlePath = generateFilePathHTML(filepath, folderNotFound, true);

  if (folderNotFound) {
    main_files_div.innerHTML = "";
    main_files_div.appendChild(titlePath);
    return;
  }

  // Add sort button

  const sortButtonElement = generateSortButtonHTML();

  // Add file list

  const filesList = generateFilesHTML(filesJson);
  const sortedFilesList = sortFilesListBySetSort(filesList);

  main_files_div.innerHTML = "";
  main_files_div.appendChild(titlePath);
  main_files_div.appendChild(sortButtonElement);

  const filesListContainer = document.createElement("div");
  filesListContainer.className = "all-files-container";
  filesListContainer.id = "all-files-container";

  sortedFilesList.forEach((element, index) => {
    filesListContainer.appendChild(element);
    // main_files_div.appendChild(element);
  });

  main_files_div.appendChild(filesListContainer);

  // Set drag and drop files

  setMainDragDrop(filepath);
}

// Removes the replace or cancel button when uploading files (From elements in upload schedule)
function removeButtonFromReplaceContainer(container) {
  const containerElements = container.children;
  for (let i = containerElements.length - 1; i >= 0; i--) {
    const el = containerElements[i];
    if (el.id === "replace-file-button" || el.id === "cancel-file-button") {
      container.removeChild(el);
    }
  }
}

// Updates the ui list from upload schedule
function documentDisplayFileList() {
  const filesDIVelement = document.getElementById("new-files-uploading-list");
  filesDIVelement.innerHTML = "";

  for (const file of filesToProcessList) {
    removeButtonFromReplaceContainer(file.container);

    if (file.waitingfor || file.replaceerror) {
      const cancelButton = document.createElement("button");
      cancelButton.className = "file-action-button cancel-files-colored";
      cancelButton.id = "cancel-file-button";
      cancelButton.ariaLabel = TRANSLATIONS.cancel_label;

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
      reloadButton.ariaLabel = TRANSLATIONS.overwrite_label;

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

// Updates in the ui the two buttons for upload file and create folder
function uploadButtons(filepath) {
  const buttonsContainer = document.getElementById("upload-buttons-container");

  const uploadFileButton = document.createElement("button");
  const newFolderButton = document.createElement("button");
  uploadFileButton.className = "upload-file";
  newFolderButton.className = "upload-folder";

  uploadFileButton.id = "upload-file-button";

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

    uploadFileSelect.addEventListener("change", async (event) =>
      onFileSelect(filepath, event)
    );
    uploadFolderSelect.addEventListener("change", async (event) =>
      onFileSelect(filepath, event)
    );

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

    const onSaveClicked = async () => {
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
              errorMessage.innerHTML = TRANSLATIONS.unvalid_folder_name;
              break;
            case 2:
              errorMessage.innerHTML = TRANSLATIONS.folder_already_exists;
              break;
            default:
              errorMessage.innerHTML = TRANSLATIONS.server_error;
              break;
          }

          errorMessage.style.display = "block";
        } catch (error) {
          alert(`${TRANSLATIONS.problem_occurred} ${error.message}`);
          window.location.reload();
        }
      }
    };

    newNameInput.oninput = () => {
      newNameInput.value = newNameInput.value.replace(
        /[^a-zA-Z0-9àèìòùÀÈÌÒÙáéíóúÁÉÍÓÚäëïöüÄËÏÖÜ._\-+@& ]/g,
        "_"
      );
      errorMessage.style.display = "none";
    };

    newNameInput.onkeydown = (event) => {
      if (event.key === 'Enter') {
        onSaveClicked();
      }
    };

    newNameInput.value = "";

    saveButton.onclick = () => {
      onSaveClicked();
    };

    modal.style.display = "flex";

    newNameInput.focus();
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
  newFileNameSpan.innerHTML = TRANSLATIONS.upload_file;
  newFolderNameSpan.innerHTML = TRANSLATIONS.create_folder;

  uploadFileButton.appendChild(fileIconContainer);
  newFolderButton.appendChild(folderIconContainer);
  uploadFileButton.appendChild(newFileNameSpan);
  newFolderButton.appendChild(newFolderNameSpan);

  buttonsContainer.innerHTML = "";
  buttonsContainer.appendChild(uploadFileButton);
  buttonsContainer.appendChild(newFolderButton);
}

// Called with press event. if outside of sidebar, close it
function handleClickOutside(event) {
  const sidebar = document.querySelector(".sidebar");
  const menuButton = document.querySelector(".menu-btn");

  if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
    closeSidebar();
  }
}

// Sets the gradient background for the given container at the given percent.
// Used to show upload file progress
function setLoadingFilePercentage(container, perc) {
  container.style.background = `linear-gradient(to right, var(--accent-green-transparent) 100%, transparent 0%)`;
  container.style.backgroundSize = `${perc}% 100%`;
  container.style.backgroundPosition = "left";
}

// Sets the complete animation background for the given container.
// Used when file upload is complete.
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

// Returns true if multiple files are selected
function multipleSelected() {
  const selectedPaths = document.querySelectorAll(
    ".files .file-container[selected]"
  );
  return selectedPaths.length >= 2;
}

// Create overlay for the dragged file, when multiple files are selected
function createOverlay(target) {
  const overlay = target.cloneNode(true);
  const fileInfo = target.querySelector(".file-info").cloneNode(true);
  overlay.innerHTML = "";
  overlay.appendChild(fileInfo);
  return overlay;
}

// Create the overlay container
function createOverlayContainer(overlay) {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.appendChild(overlay);
  document.body.appendChild(container);
  return container;
}

// Create a second overlay when multiple files are being dragged
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

// Toggles if the element is selected
function toggleSelected(element, isSelected) {
  if (isSelected) {
    element.setAttribute("selected", "");
  } else {
    element.removeAttribute("selected");
  }
}

// Deselects all files selected
function deselectAll() {
  const files = document.querySelectorAll(".file-container");
  files.forEach((file) => {
    toggleSelected(file, false);
  });
}

// Check if this is touch so disable the multiple selected files
function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}