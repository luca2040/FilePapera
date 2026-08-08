// Define some variables for the upload process

let filesToProcessList = [];
let currentFileID = 1;

let uploadingFiles = false;

// True while the upload queue is being drained, to avoid concurrent runs
let isProcessing = false;

// True if at least one file was uploaded during the current drain
let uploadedAny = false;

// Track active chunked uploads for cleanup on unload
const activeChunkedUploads = new Map(); // fileElementId -> upload_id

// Returns the next file in the list that is ready to be uploaded
function getNextReadyFile() {
  return filesToProcessList.find(
    (item) =>
      !item.waitingfor &&
      !item.alreadydone &&
      !item.replaceerror &&
      !item.storageerror
  );
}

// Uploads all the files that are ready, one at a time, then stops.
// It gets restarted every time a new file becomes ready for upload.
async function processUploadQueue() {
  if (isProcessing) return;

  isProcessing = true;

  try {
    while (true) {
      const elementToProcess = getNextReadyFile();

      if (!elementToProcess) break;

      uploadingFiles = true;

      elementToProcess.container.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      await updateUploadElement(elementToProcess);

      uploadedAny = true;
    }

    uploadingFiles = false;

    if (uploadedAny) {
      uploadedAny = false;
      await reloadFilesRequest();
    }
  } finally {
    isProcessing = false;

    // New files may have been added while uploading, so restart if there is more work
    if (getNextReadyFile()) processUploadQueue();
  }
}

// Remove a file from upload schedule list given its item.id
function removeFilesElementById(id) {
  const index = filesToProcessList.findIndex((item) => item.id === id);
  if (index > -1) {
    filesToProcessList.splice(index, 1);
  }
}

// Remove all files that are already uploaded or have some errors from schedule
function resetDoneFiles() {
  filesToProcessList = filesToProcessList.filter(
    (file) => !(file.alreadydone || file.replaceerror || file.storageerror)
  );
}

// Configuration for chunked uploads
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB (default, server response takes precedence)
const CHUNKED_THRESHOLD = 10 * 1024 * 1024; // 10 MB - files larger use chunked upload
const MAX_PARALLEL_CHUNKS = 3;
const HASH_CHUNK_SIZE = 1024 * 1024; // 1 MB for hash calculation
const HASH_CHUNKED_THRESHOLD = 50 * 1024 * 1024; // 50 MB threshold for streaming hash

// Computes SHA-256 hash for small files using Web Crypto (fast, single allocation)
async function computeFileHashSmall(file, onProgress) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  if (onProgress) onProgress(100);
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Computes SHA-256 hash using streaming (constant memory) via js-sha256 (loaded globally)
async function computeFileHashStreaming(file, onProgress, abortSignal) {
  const totalSize = file.size;
  let processed = 0;
  const hasher = sha256.create();

  for (let offset = 0; offset < totalSize; offset += HASH_CHUNK_SIZE) {
    if (abortSignal?.aborted) {
      throw new Error("Hash computation cancelled");
    }

    const chunk = file.slice(offset, offset + HASH_CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    processed += chunk.size;

    if (onProgress) {
      onProgress((processed / totalSize) * 100);
    }

    // Yield to event loop to keep UI responsive
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return hasher.hex();
}

// Unified hash computation - uses streaming for large files
async function computeFileHashAuto(file, onProgress, abortSignal) {
  if (file.size > HASH_CHUNKED_THRESHOLD) {
    return computeFileHashStreaming(file, onProgress, abortSignal);
  }
  return computeFileHashSmall(file, onProgress);
}

async function uploadChunked(file, path, container, fileElement) {
  const totalSize = file.size;

  // Compute hash before upload
  setLoadingFilePercentage(container, 0);
  const statusDiv = container.querySelector(".file-name");
  if (statusDiv) {
    statusDiv.textContent = `${file.name} (computing hash...)`;
  }

  // AbortController for hash computation cancellation
  const hashAbortController = new AbortController();
  fileElement.hashAbortController = hashAbortController;

  let expectedHash;
  try {
    expectedHash = await computeFileHashAuto(file, (progress) => {
      setLoadingFilePercentage(container, progress * 0.1); // 10% for hashing
    }, hashAbortController.signal);
  } catch (error) {
    throw new Error(`Hash computation failed: ${error.message}`);
  }

  const initiateResponse = await fetch("/upload/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      filename: file.name,
      total_size: totalSize,
      target_path: path,
      expected_hash: expectedHash,
      chunk_size: 5 * 1024 * 1024, // 5 MB
    }),
  });

  if (!initiateResponse.ok) {
    const err = await initiateResponse.json();
    throw new Error(err.error || "Failed to initiate upload");
  }

  const { upload_id, chunk_size, total_chunks } = await initiateResponse.json();
  fileElement.upload_id = upload_id;
  activeChunkedUploads.set(fileElement.id, upload_id);

  const cancelBtn = container.querySelector(".cancel-upload-btn");
  if (cancelBtn) {
    cancelBtn.onclick = () => cancelChunkedUpload(upload_id, fileElement);
    cancelBtn.classList.add("visible");
  }

  const uploadedChunks = new Set();
  let completedChunks = 0;
  // Use fileElement to share abort state with cancel function
  fileElement.aborted = false;
  // AbortController for true fetch cancellation
  const abortController = new AbortController();
  fileElement.abortController = abortController;

  // Semaphore-based concurrency control
  let runningCount = 0;
  const queue = Array.from({ length: total_chunks }, (_, i) => i);

  async function uploadSingleChunk(chunkIndex) {
    if (fileElement.aborted || abortController.signal.aborted) throw new Error("Upload cancelled");

    const start = chunkIndex * chunk_size;
    const end = Math.min(start + chunk_size, totalSize);
    const chunkBlob = file.slice(start, end);

    const response = await fetch(`/upload/chunk?upload_id=${upload_id}&chunk_index=${chunkIndex}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      credentials: "include",
      body: chunkBlob,
      signal: abortController.signal,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Chunk ${chunkIndex}: ${err.error || "Upload failed"}`);
    }

    uploadedChunks.add(chunkIndex);
    completedChunks++;
    const progress = (completedChunks / total_chunks) * 100;
    setLoadingFilePercentage(container, progress);
  }

  function startNext() {
    while (queue.length > 0 && runningCount < MAX_PARALLEL_CHUNKS && !fileElement.aborted && !abortController.signal.aborted) {
      const chunkIndex = queue.shift();
      if (uploadedChunks.has(chunkIndex)) continue;

      runningCount++;
      const promise = uploadSingleChunk(chunkIndex);
      promise.finally(() => {
        runningCount--;
        startNext();
      });
    }
  }

  try {
    startNext();
    while (runningCount > 0 && !fileElement.aborted && !abortController.signal.aborted) {
      // Wait for at least one chunk to complete
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (fileElement.aborted || abortController.signal.aborted) throw new Error("Upload cancelled");

    const completeResponse = await fetch("/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ upload_id }),
    });

    if (!completeResponse.ok) {
      const err = await completeResponse.json();
      throw new Error(err.error || "Failed to complete upload");
    }

    return await completeResponse.json();
  } finally {
    activeChunkedUploads.delete(fileElement.id);
    if (cancelBtn) cancelBtn.classList.remove("visible");
  }
}

async function cancelChunkedUpload(uploadId, fileElement) {
  if (!uploadId) return;
  // Signal the upload loop to abort gracefully
  fileElement.aborted = true;
  if (fileElement.abortController) {
    fileElement.abortController.abort();
  }
  // Also abort hash computation if in progress
  if (fileElement.hashAbortController) {
    fileElement.hashAbortController.abort();
  }
  try {
    await fetch("/upload/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ upload_id: uploadId }),
    });
  } finally {
    activeChunkedUploads.delete(fileElement.id);
    fileElement.upload_id = null;
    fileElement.alreadydone = true;
    fileElement.cancelled = true;
    // Update UI immediately
    const container = fileElement.container;
    if (container) {
      const cancelBtn = container.querySelector(".cancel-upload-btn");
      if (cancelBtn) cancelBtn.classList.remove("visible");
      // Show cancelled state
      container.classList.add("red-transparent-bg");
      const statusDiv = container.querySelector(".file-name") || container.firstElementChild;
      if (statusDiv) {
        statusDiv.textContent = `${statusDiv.textContent} (cancelled)`;
      }
    }
  }
}

// Cleanup on page unload
window.addEventListener("beforeunload", async () => {
  for (const [fileId, uploadId] of activeChunkedUploads) {
    try {
      await fetch("/upload/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ upload_id: uploadId }),
        keepalive: true,
      });
    } catch (_) { }
  }
});

// Uploads the given file and registers its element for ui progress bar update
async function updateUploadElement(elementToProcess) {
  const container = elementToProcess.container;
  const fileToSend = elementToProcess.file;

  if (!fileToSend) {
    elementToProcess.alreadydone = true;
    return;
  }

  const path = elementToProcess.path;

  if (fileToSend.size > CHUNKED_THRESHOLD) {
    try {
      await uploadChunked(fileToSend, path, container, elementToProcess);
      elementToProcess.alreadydone = true;
      setLoadingFileComplete(container);
      return;
    } catch (error) {
      // Cancelled - don't show error, just mark as done and continue queue
      if (error.message === "Upload cancelled" || elementToProcess.cancelled) {
        elementToProcess.alreadydone = true;
        return;
      }
      // Other error - show in UI, mark as done, continue queue
      elementToProcess.alreadydone = true;
      elementToProcess.storageerror = true;
      container.classList.add("red-transparent-bg");
      const errorDiv = document.createElement("div");
      errorDiv.className = "file-name no-text-select add-error-icon no-margin";
      errorDiv.textContent = `${TRANSLATIONS.error_uploading_file}: ${error.message}`;
      container.innerHTML = "";
      container.appendChild(errorDiv);
      return;
    }
  }

  // Small file: use original single-request upload
  // Compute hash first
  setLoadingFilePercentage(container, 0);
  const statusDiv = container.querySelector(".file-name");
  if (statusDiv) {
    statusDiv.textContent = `${fileToSend.name} (computing hash...)`;
  }

  const hashAbortController = new AbortController();
  elementToProcess.hashAbortController = hashAbortController;

  // Wire up cancel button for small files
  const cancelBtn = container.querySelector(".cancel-upload-btn");
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      hashAbortController.abort();
      if (xhr) xhr.abort();
    };
    cancelBtn.classList.add("visible");
  }

  let expectedHash;
  let xhr = null;
  try {
    expectedHash = await computeFileHashAuto(fileToSend, (progress) => {
      setLoadingFilePercentage(container, progress * 0.1); // 10% for hashing
    }, hashAbortController.signal);
  } catch (error) {
    elementToProcess.alreadydone = true;
    elementToProcess.storageerror = true;
    container.classList.add("red-transparent-bg");
    const errorDiv = document.createElement("div");
    errorDiv.className = "file-name no-text-select add-error-icon no-margin";
    errorDiv.textContent = `${TRANSLATIONS.error_uploading_file}: Hash computation failed: ${error.message}`;
    container.innerHTML = "";
    container.appendChild(errorDiv);
    return;
  }

  const formData = new FormData();
  formData.append("file", fileToSend);

  const uploadPromise = new Promise((resolve, reject) => {
    xhr = new XMLHttpRequest();

    xhr.open("POST", `/upload/file?path=${encodeURIComponent(path)}&expected_hash=${expectedHash}`, true);

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

        resolve(result);
      } else {
        reject(new Error(`${TRANSLATIONS.upload_failed} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error(TRANSLATIONS.network_error));
    };

    xhr.send(formData);
  });

  try {
    await uploadPromise;
  } catch (error) {
    // Don't reload - mark as done and continue queue
    elementToProcess.alreadydone = true;
    elementToProcess.storageerror = true;
    container.classList.add("red-transparent-bg");
    const errorDiv = document.createElement("div");
    errorDiv.className = "file-name no-text-select add-error-icon no-margin";
    errorDiv.textContent = `${TRANSLATIONS.error_uploading_file}: ${error.message}`;
    container.innerHTML = "";
    container.appendChild(errorDiv);
  } finally {
    // Hide cancel button
    const cancelBtn = container.querySelector(".cancel-upload-btn");
    if (cancelBtn) cancelBtn.classList.remove("visible");
  }
}

// Used when files are selected from user input
async function onFileSelect(filepath, event, files_) {
  let files = [];

  if (event) files = event.target.files;
  else files = files_;

  let queryData = [];
  let tempFilesToProcessList = [];

  let size = 0;

  const fileArray = Array.from(files);
  const BATCH_SIZE = 50;
  const fileContainer = document.getElementById("file-list-modal") || document.body;

  // Show preparing indicator
  const preparingDiv = document.createElement("div");
  preparingDiv.className = "file-container modal-upload";
  preparingDiv.innerHTML = '<div class="file-name no-text-select">Preparing files...</div>';
  fileContainer.appendChild(preparingDiv);

  // Process files in batches to avoid blocking the main thread
  for (let batchStart = 0; batchStart < fileArray.length; batchStart += BATCH_SIZE) {
    const batch = fileArray.slice(batchStart, batchStart + BATCH_SIZE);

    for (const singleFile of batch) {
      const fileContainerDiv = document.createElement("div");
      fileContainerDiv.className = "file-container modal-upload";

      const fileTitleDiv = document.createElement("div");
      fileTitleDiv.className = "file-name no-text-select add-file-icon no-margin";
      fileTitleDiv.innerHTML = singleFile.name;

      fileContainerDiv.appendChild(fileTitleDiv);

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "cancel-upload-btn";
      cancelBtn.textContent = "Cancel";
      fileContainerDiv.appendChild(cancelBtn);

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

      if (singleFile.webkitRelativePath && singleFile.webkitRelativePath !== "")
        completePath =
          filepath.replace(/^\/+/, "") + "/" + singleFile.webkitRelativePath;
      else completePath = filepath.replace(/^\/+/, "") + "/" + singleFile.name;

      queryData.push({
        id: newFileElement.id,
        filepath: completePath,
      });
      size += singleFile.size;

      tempFilesToProcessList.push(newFileElement);
    }

    // Yield to the event loop between batches
    if (batchStart + BATCH_SIZE < fileArray.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // Remove preparing indicator
  preparingDiv.remove();

  const response = await getAvailableFiles({ data: queryData, size: size });

  if (!response) return;

  try {
    if (response.ok) {
      const responseJSON = await response.json();

      if (responseJSON["storageError"]) {
        const storageErrorDiv = document.createElement("div");
        storageErrorDiv.className =
          "file-container modal-upload transparent-red";

        const fileTitleDiv = document.createElement("div");
        fileTitleDiv.className =
          "file-name no-text-select storageerror add-error-icon no-margin";
        fileTitleDiv.innerHTML = TRANSLATIONS.no_storage_left;

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
      alert(TRANSLATIONS.error_preparing_file_upload);
      window.location.reload();
    }
  } catch (error) {
    alert(
      `${TRANSLATIONS.error_preparing_file_upload}: ${error.message}`
    );
    window.location.reload();
  }

  filesToProcessList = filesToProcessList.concat(tempFilesToProcessList);

  documentDisplayFileList();
  checkTotalReplaceButton();

  processUploadQueue();
}

// To parse user input
function readWebKitEntry(item, path = "") {
  return new Promise((resolve, reject) => {
    if (item.isFile) {
      item.file(
        (file) => resolve([file]),
        (error) => reject(error)
      );
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      dirReader.readEntries((entries) => {
        const promises = entries.map((entry) =>
          readWebKitEntry(entry, path + item.name + "/")
        );
        Promise.all(promises)
          .then((results) => {
            resolve(results.flat());
          })
          .catch((err) => {
            alert(TRANSLATIONS.error_reading_file);
            window.location.reload();
            reject(err);
          });
      });
    } else {
      resolve([]);
    }
  });
}

// When user drags files into the specified filepath, trigger the event and upload files. Function called externally by container
async function uploadFilesFromDragEvent(event, filepath) {
  let files = [];

  const items = event.dataTransfer.items;
  const promises = [];

  for (const item_ of items) {
    const item = item_.webkitGetAsEntry();
    if (item) {
      promises.push(readWebKitEntry(item));
    }
  }

  const results = await Promise.all(promises);
  files = results.flat();

  const fileButton = document.getElementById("upload-file-button");
  fileButton.click();
  await onFileSelect(filepath, null, files);
}

// Sets before unload to warn user if still uploading files
window.addEventListener("beforeunload", function (e) {
  var message = TRANSLATIONS.page_reload_confirm;

  if (uploadingFiles) {
    e.preventDefault();
    e.returnValue = message;
    return message;
  } else return null;
});