document.getElementById("uploadForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const fileInput = document.getElementById("fileInput");

  const folder = uploadPath;

  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const messageDiv = document.getElementById("message");

  const file = fileInput.files[0];
  const chunkSize = 10 * 1024 * 1024;
  let offset = 0;
  let totalChunks = Math.ceil(file.size / chunkSize);

  progressBar.value = 0;
  progressText.textContent = "";
  messageDiv.textContent = "";

  function uploadChunk() {
    if (offset >= file.size) {
      checkMergingStatus();
      return;
    }

    const formData = new FormData();
    const chunk = file.slice(offset, offset + chunkSize);
    formData.append("file", chunk, file.name + ".file");
    formData.append("folder", folder);
    formData.append("chunk", offset / chunkSize);
    formData.append("totalChunks", totalChunks);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", function (e) {
      if (e.lengthComputable) {
        const percentComplete = Math.min(
          ((offset + e.loaded) / file.size) * 100,
          100
        );
        progressBar.value = percentComplete;
        progressText.textContent = Math.round(percentComplete) + "%";
      }
    });

    xhr.onload = function () {
      if (xhr.status === 200) {
        offset += chunkSize;
        uploadChunk();
      } else {
        messageDiv.textContent = `Error: ${xhr.statusText}`;
      }
    };

    xhr.onerror = function () {
      messageDiv.textContent = `Error: Could not upload chunk.`;
    };

    xhr.open("POST", `/upload?folder=${encodeURIComponent(folder)}`, true);
    xhr.send(formData);
  }

  function checkMergingStatus() {
    const filename = file.name;
    const statusInterval = setInterval(() => {
      fetch(`/merge_status?filename=${encodeURIComponent(filename)}.file`)
        .then((response) => response.json())
        .then((data) => {
          const status = data.status;
          if (status === 0) {
            progressBar.value = 0;
            progressText.textContent = "Merging: In Progress";
          } else if (status < 100) {
            progressBar.value = status;
            progressText.textContent = `Merging: ${status}%`;
          } else {
            clearInterval(statusInterval);
            loadFileList();
            progressBar.value = 100;
            progressText.textContent = "Upload complete!";
          }
        })
        .catch((error) => {
          clearInterval(statusInterval);
          messageDiv.textContent = `Error: ${error}`;
        });
    }, 100);
  }

  uploadChunk();
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
