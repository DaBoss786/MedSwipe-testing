// TOS and Privacy Policy Modal Handlers
document.addEventListener('DOMContentLoaded', function() {
  const viewTOS = document.getElementById('viewTOS');
  const viewPrivacy = document.getElementById('viewPrivacy');
  const termsOfServiceModal = document.getElementById('termsOfServiceModal');
  const privacyPolicyModal = document.getElementById('privacyPolicyModal');
  const closeModalButtons = document.querySelectorAll('.close-modal');

  // Open TOS Modal
  viewTOS.addEventListener('click', function(e) {
    e.preventDefault();
    termsOfServiceModal.style.display = 'flex';
  });

  // Open Privacy Policy Modal
  viewPrivacy.addEventListener('click', function(e) {
    e.preventDefault();
    privacyPolicyModal.style.display = 'flex';
  });

  // Close Modal Buttons
  closeModalButtons.forEach(button => {
    button.addEventListener('click', function() {
      termsOfServiceModal.style.display = 'none';
      privacyPolicyModal.style.display = 'none';
    });
  });

  // Close modals when clicking outside
  [termsOfServiceModal, privacyPolicyModal].forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  // Add these lines after the existing event listeners
  const tosMenuItem = document.getElementById('tosMenuItem');
  const privacyMenuItem = document.getElementById('privacyMenuItem');

  // Open TOS Modal from side menu
  tosMenuItem.addEventListener('click', function() {
    termsOfServiceModal.style.display = 'flex';
    // Close the side menu after clicking
    const sideMenu = document.getElementById("sideMenu");
    if (sideMenu) sideMenu.classList.remove("open");
  });

  // Open Privacy Policy Modal from side menu
  privacyMenuItem.addEventListener('click', function() {
    privacyPolicyModal.style.display = 'flex';
    // Close the side menu after clicking
    const sideMenu = document.getElementById("sideMenu");
    if (sideMenu) sideMenu.classList.remove("open");
  });
});

