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
});

// Add event listeners for TOS and Privacy links in registration form
document.addEventListener('DOMContentLoaded', function() {
  // Get the new links in the registration form
  const registerViewTOS = document.getElementById('registerViewTOS');
  const registerViewPrivacy = document.getElementById('registerViewPrivacy');
  const agreeTerms = document.getElementById('agreeTerms');
  const registerForm = document.getElementById('registerForm');
  
  // Get the modals
  const termsOfServiceModal = document.getElementById('termsOfServiceModal');
  const privacyPolicyModal = document.getElementById('privacyPolicyModal');
  
  // Add event listeners for the links in the registration form
  if (registerViewTOS) {
    registerViewTOS.addEventListener('click', function(e) {
      e.preventDefault();
      if (termsOfServiceModal) {
        termsOfServiceModal.style.display = 'flex';
      }
    });
  }
  
  if (registerViewPrivacy) {
    registerViewPrivacy.addEventListener('click', function(e) {
      e.preventDefault();
      if (privacyPolicyModal) {
        privacyPolicyModal.style.display = 'flex';
      }
    });
  }
  
  // Make sure the checkbox is required for form submission
  if (registerForm && agreeTerms) {
    registerForm.addEventListener('submit', function(e) {
      if (!agreeTerms.checked) {
        e.preventDefault();
        const termsError = document.getElementById('termsError');
        if (termsError) {
          termsError.textContent = 'You must agree to the Terms of Service and Privacy Policy';
        }
        return false;
      }
    });
  }
});
