document.getElementById("uploadForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const fileInput = document.getElementById("fileInput");
  const folder = uploadPath;

  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const messageDiv = document.getElementById("message");

  const file = fileInput.files[0];

  progressBar.value = 0;
  progressText.textContent = "";
  messageDiv.textContent = "";

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener("progress", function (e) {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / file.size) * 100;
      progressBar.value = percentComplete;
      progressText.textContent = Math.round(percentComplete) + "%";
    }
  });

  xhr.onload = function () {
    if (xhr.status === 200) {
      progressBar.value = 100;
      progressText.textContent = "Upload complete!";
      loadFileList();
    } else {
      messageDiv.textContent = `Error: ${xhr.statusText}`;
    }
  };

  xhr.onerror = function () {
    messageDiv.textContent = `Error: Could not upload file.`;
  };

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  xhr.open("POST", `/upload?folder=${encodeURIComponent(folder)}`, true);
  xhr.send(formData);
});

document.getElementById("folderForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const folderInput = document.getElementById("folderInput");

  const folder = uploadPath;
  const folderName = folderInput.value;

  const messageDiv = document.getElementById("folderMessage");

  messageDiv.textContent = "";

  fetch(
    `/createFolder?path=${encodeURIComponent(folder)}&name=${encodeURIComponent(
      folderName
    )}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      messageDiv.textContent = data.message || "Folder created successfully!";
    })
    .catch((error) => {
      messageDiv.textContent = `Error: ${error.message}`;
    });

  loadFileList();
});
