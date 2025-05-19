// Reloads the main ui, fetching from server
async function reloadFilesRequest() {
  filepath = checkPath();

  const urlParams = new URLSearchParams(window.location.search);
  const isNotFoundInURL = urlParams.get("notfound", "false") === "true";

  let pageNotFound = true;
  let fileListJson = [];

  if (!isNotFoundInURL) {
    fileListJson = await loadFileList(filepath);
    pageNotFound = "not_found" in fileListJson;
  }

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

// Start the recursive uploading schedule
document.addEventListener("DOMContentLoaded", function () {
  uploadFilesFromListRecursive();
});

// What to do when pressing keys. Used for the delete key
document.addEventListener("keydown", (event) => {
  if (event.key === "Delete") {
    const selectedPaths = getSelectedElementsPaths();

    const modal = document.getElementById("delete-file-modal");
    const modalTitle = document.getElementById("delete-file-title");
    const closeButton = document.getElementById("delete-file-close");
    const saveButton = document.getElementById("delete-file-save");
    const cancelButton = document.getElementById("delete-file-cancel");
    const deleteName = document.getElementById("delete-file-name");

    modalTitle.innerHTML = TRANSLATIONS.delete_label;
    deleteName.innerHTML = "";

    cancelButton.style.display = "inline-block";

    selectedPaths.forEach(([path, name], index) => {
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
    closeButton.onclick = () => {
      closeModal();
    };
    cancelButton.onclick = () => {
      closeModal();
    };

    saveButton.onclick = async () => {
      selectedPaths.forEach(async ([path, name], index) => {
        await deleteElement(path);
      });

      closeModal();
      reloadFilesRequest();
    };

    toggleLinkAttribute("modalOpen", true);
    modal.style.display = "flex";
  }
});

// When user navigates in browser
window.onpopstate = () => {
  reloadFilesRequest();

  // so you can close modals when you press return
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has("modalOpen")) {
    const modals = document.querySelectorAll(".modal-background");
    modals.forEach((modal) => {
      modal.style.display = "none";
    });
  }
};
