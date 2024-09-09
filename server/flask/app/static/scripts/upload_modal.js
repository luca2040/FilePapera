var modal = document.getElementById("uploadModal");
var folderModal = document.getElementById("folderModal");
var closeModal = document.getElementById("closeModalBtn");
var closeFolderModal = document.getElementById("closeFolderModalBtn");

var uploadPath;

function openModal(path) {
  modal.style.display = "block";
  uploadPath = path;
}

function openFolderModal(path) {
  folderModal.style.display = "block";
  uploadPath = path;
}

function closeFolderModal_fn() {
  folderModal.style.display = "none";

  const folderInput = document.getElementById("folderInput");
  const messageDiv = document.getElementById("folderMessage");

  folderInput.value = "";
  messageDiv.textContent = "";
}

closeModal.onclick = function () {
  modal.style.display = "none";
};

closeFolderModal.onclick = function () {
  closeFolderModal_fn();
};

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
  if (event.target == folderModal) {
    closeFolderModal_fn();
  }
};
