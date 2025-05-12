// Define some variables for the upload process

let filesToProcessList = [];
let currentFileID = 1;

let newFilesLoaded = false;

let uploadingFiles = false;

// Constantly checks if there are any new files ready for upload, and uploads them
async function uploadFilesFromListRecursive() {
  while (true) {
    const elementToProcess = filesToProcessList.find(
      (item) =>
        !item.waitingfor &&
        !item.alreadydone &&
        !item.replaceerror &&
        !item.storageerror
    );

    if (!elementToProcess) {
      uploadingFiles = false;
      if (!newFilesLoaded) {
        reloadFilesRequest();
        newFilesLoaded = true;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    uploadingFiles = true;
    newFilesLoaded = false;

    elementToProcess.container.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    await updateUploadElement(elementToProcess);
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

// Uploads the given file and registers its element for ui progress bar update
async function updateUploadElement(elementToProcess) {
  const container = elementToProcess.container;
  const fileToSend = elementToProcess.file;

  // Checking file hash would be too slow for large files, just upload it. [TODO: need to do something about this]

  const formData = new FormData();
  formData.append("file", fileToSend);
  const path = elementToProcess.path;

  const uploadPromise = new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `/upload/file?path=${encodeURIComponent(path)}`, true);

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
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error"));
    };

    xhr.send(formData);
  });

  try {
    await uploadPromise;
  } catch (error) {
    alert("Error uploading file");
    window.location.reload();
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

  for (const singleFile of files) {
    const fileContainerDiv = document.createElement("div");
    fileContainerDiv.className = "file-container modal-upload";

    const fileTitleDiv = document.createElement("div");
    fileTitleDiv.className = "file-name no-text-select add-file-icon no-margin";
    fileTitleDiv.innerHTML = singleFile.name;

    fileContainerDiv.appendChild(fileTitleDiv);

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
        fileTitleDiv.innerHTML = "Memoria esaurita";

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
      alert("Errore durante la preparazione al caricamento dei file");
      window.location.reload();
    }
  } catch (error) {
    alert(
      "Errore durante la preparazione al caricamento dei file: " + error.message
    );
    window.location.reload();
  }

  filesToProcessList = filesToProcessList.concat(tempFilesToProcessList);

  documentDisplayFileList();
  checkTotalReplaceButton();
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
            alert("Errore durante la lettura del file.");
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
  var message = "Il caricamento in corso dei file verrà annullato, continuare?";

  if (uploadingFiles) {
    e.preventDefault();
    e.returnValue = message;
    return message;
  } else return null;
});