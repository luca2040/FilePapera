function loadFileList(folder = "") {
  const listEndpoint = `/list?path=${encodeURIComponent(folder)}`;
  fetch(listEndpoint)
    .then((response) => response.json())
    .then((data) => {
      if (data.files) {
        renderFileList(data.files, folder);
      } else {
        alert("Error fetching files: " + data.error);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function renderFileList(
  files,
  folder,
  parentElement = document.getElementById("fileList")
) {
  parentElement.innerHTML = "";

  const fileList = files.filter((file) => file.indexOf(".file") !== -1).sort();
  const folderList = files
    .filter((file) => file.indexOf(".file") === -1)
    .sort();

  const sortedFilesAndFolders = [...folderList, ...fileList];

  sortedFilesAndFolders.forEach((file) => {
    const listItem = document.createElement("li");
    listItem.className =
      file.indexOf(".file") === -1 ? "folder-item" : "file-item";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "file-name";
    fileNameSpan.textContent = file.replace(".file", "");

    const fileActionsDiv = document.createElement("div");
    fileActionsDiv.className = "file-actions";

    const deleteButton = document.createElement("a");
    deleteButton.className = "action-button";
    deleteButton.textContent = "Delete";
    deleteButton.href = "#";
    deleteButton.onclick = function () {
      confirmDelete(folder ? `${folder}/${file}` : file);
    };

    fileActionsDiv.appendChild(deleteButton);

    if (file.indexOf(".file") === -1) {
      fileNameSpan.onclick = function () {
        toggleFolderContent(folder ? `${folder}/${file}` : file, listItem);
      };

      const newFolderButton = document.createElement("a");
      newFolderButton.className = "action-button";
      newFolderButton.textContent = "Create folder";
      newFolderButton.href = "#";
      newFolderButton.onclick = function () {
        openFolderModal(folder ? `${folder}/${file}` : file);
      };

      const newFileButton = document.createElement("a");
      newFileButton.className = "action-button";
      newFileButton.textContent = "Upload file here";
      newFileButton.href = "#";
      newFileButton.onclick = function () {
        openModal(folder ? `${folder}/${file}` : file);
      };

      fileActionsDiv.appendChild(newFolderButton);
      fileActionsDiv.appendChild(newFileButton);

      const nestedList = document.createElement("ul");
      nestedList.className = "folder-content";
      listItem.appendChild(nestedList);
    } else {
      const downloadButton = document.createElement("a");
      downloadButton.className = "action-button";
      downloadButton.textContent = "Download";
      downloadButton.href = "#";
      downloadButton.onclick = function () {
        downloadFile(folder ? `${folder}/${file}` : file);
      };

      fileActionsDiv.appendChild(downloadButton);
    }

    listItem.appendChild(fileNameSpan);
    listItem.appendChild(fileActionsDiv);
    parentElement.appendChild(listItem);
  });
}

function toggleFolderContent(folder, listItem) {
  const nestedList = listItem.querySelector(".folder-content");

  if (nestedList.style.display === "none" || nestedList.style.display === "") {
    nestedList.style.display = "block";

    const listEndpoint = `/list?path=${encodeURIComponent(folder)}`;
    fetch(listEndpoint)
      .then((response) => response.json())
      .then((data) => {
        if (data.files) {
          renderFileList(data.files, folder, nestedList);
        } else {
          alert("Error fetching folder contents: " + data.error);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  } else {
    nestedList.style.display = "none";
  }
}

function confirmDelete(filePath) {
  if (confirm(`Are you sure you want to delete ${filePath}?`)) {
    fetch(`/delete?target=${encodeURIComponent(filePath)}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message) {
          alert("File/folder deleted successfully");
          loadFileList();
        } else {
          alert("Error deleting file/folder: " + data.error);
          loadFileList();
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }
}

function downloadFile(filePath) {
  const url = new URL("/download", window.location.origin);
  url.searchParams.append("filepath", encodeURIComponent(filePath));

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filePath.split("/").pop();

  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
}

window.onload = function () {
  loadFileList();
};
