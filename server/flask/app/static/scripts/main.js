document.getElementById("uploadForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const fileInput = document.getElementById("fileInput");
  const folderInput = document.getElementById("folderInput");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const messageDiv = document.getElementById("message");

  const file = fileInput.files[0];
  const folder = folderInput.value;
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
    formData.append("file", chunk, file.name);
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

    xhr.open("POST", `/upload/${folder}`, true);
    xhr.send(formData);
  }

  function checkMergingStatus() {
    const filename = file.name;
    const statusInterval = setInterval(() => {
      fetch(`/merge_status/${filename}`)
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
