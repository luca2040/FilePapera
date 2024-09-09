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

closeModal.onclick = function () {
  modal.style.display = "none";
};

closeFolderModal.onclick = function () {
  folderModal.style.display = "none";
};

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
  if (event.target == folderModal) {
    folderModal.style.display = "none";
  }
};
