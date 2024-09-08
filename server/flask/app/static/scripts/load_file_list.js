// Function to load and display files/folders
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

// Function to render files and folders in a tree structure
function renderFileList(
  files,
  folder,
  parentElement = document.getElementById("fileList")
) {
  parentElement.innerHTML = ""; // Clear the list before rendering

  files.forEach((file) => {
    const listItem = document.createElement("li");
    listItem.className = "file-item";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "file-name";
    fileNameSpan.textContent = file;

    const fileActionsDiv = document.createElement("div");
    fileActionsDiv.className = "file-actions";

    // Add action buttons (e.g., delete)
    const deleteButton = document.createElement("a");
    deleteButton.className = "action-button";
    deleteButton.textContent = "Delete";
    deleteButton.href = "#";
    deleteButton.onclick = function () {
      confirmDelete(folder ? `${folder}/${file}` : file);
    };

    fileActionsDiv.appendChild(deleteButton);

    // Check if the file is a folder
    if (file.indexOf(".") === -1) {
      // Simple check for folders
      listItem.className = "folder-item";
      fileNameSpan.onclick = function () {
        toggleFolderContent(folder ? `${folder}/${file}` : file, listItem);
      };

      // Create a nested list for folder content
      const nestedList = document.createElement("ul");
      nestedList.className = "folder-content";
      listItem.appendChild(nestedList);
    }

    listItem.appendChild(fileNameSpan);
    listItem.appendChild(fileActionsDiv);
    parentElement.appendChild(listItem);
  });
}

// Function to toggle folder content (expand/collapse)
function toggleFolderContent(folder, listItem) {
  const nestedList = listItem.querySelector(".folder-content");

  if (nestedList.style.display === "none" || nestedList.style.display === "") {
    nestedList.style.display = "block"; // Show folder content

    // Load and render files in the folder
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
    nestedList.style.display = "none"; // Hide folder content
  }
}

// Function to confirm and delete a file or folder
function confirmDelete(filePath) {
  if (confirm(`Are you sure you want to delete ${filePath}?`)) {
    fetch(`/delete/${filePath}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message) {
          alert("File/folder deleted successfully");
          loadFileList(); // Reload the file list
        } else {
          alert("Error deleting file/folder: " + data.error);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }
}

// Load the file list on page load
window.onload = function () {
  loadFileList();
};
