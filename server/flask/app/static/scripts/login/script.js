function showPassword() {
  const passwordInput = document.getElementById("password");
  const passwordButtonIcon = document.querySelector(".password-button i");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    passwordButtonIcon.classList.replace("fa-eye", "fa-eye-slash");
  } else {
    passwordInput.type = "password";
    passwordButtonIcon.classList.replace("fa-eye-slash", "fa-eye");
  }
}