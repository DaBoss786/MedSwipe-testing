// Add this to your existing JavaScript files or create a new onboarding.js file

// Check if user needs onboarding when app starts
document.addEventListener('DOMContentLoaded', function() {
  // First wait for splash screen to complete
  setTimeout(function() {
    checkOnboardingNeeded();
  }, 2000); // Same timing as splash screen
});

// Check if onboarding is needed
function checkOnboardingNeeded() {
  const onboardingComplete = localStorage.getItem('medswipeOnboardingComplete');
  const isRegistered = localStorage.getItem('medswipeRegistered');
  
  if (!onboardingComplete || !isRegistered) {
    // Show onboarding
    startOnboarding();
  } else {
    // Go straight to dashboard
    document.getElementById('mainOptions').style.display = 'flex';
  }
}

// Start the onboarding process
function startOnboarding() {
  // Show toolbar
  document.querySelector('.toolbar').style.display = 'flex';
  
  // Show onboarding elements
  document.getElementById('onboardingSwiper').style.display = 'block';
  document.getElementById('onboardingToolbar').style.display = 'flex';
  
  // Hide dashboard
  document.getElementById('mainOptions').style.display = 'none';
  
  // Initialize the onboarding swiper
  window.onboardingSwiper = new Swiper('#onboardingSwiper', {
    direction: 'vertical',
    allowTouchMove: true,
    threshold: 50,
    loop: false
  });
  
  // Update progress bar when slides change
  window.onboardingSwiper.on('slideChange', function() {
    updateOnboardingProgress();
  });
  
  // Add event listeners to onboarding buttons
  addOnboardingListeners();
  
  // Initialize progress bar
  updateOnboardingProgress();
}

// Update onboarding progress bar and counter
function updateOnboardingProgress() {
  const currentSlide = window.onboardingSwiper.activeIndex + 1;
  const totalSlides = 4; // Total number of onboarding slides
  
  // Update progress text
  document.getElementById('onboardingProgress').textContent = `${currentSlide} / ${totalSlides}`;
  
  // Update progress bar
  const progressPercent = (currentSlide / totalSlides) * 100;
  document.getElementById('onboardingProgressBar').style.width = progressPercent + '%';
}

// Add event listeners to onboarding buttons
function addOnboardingListeners() {
  // Already have account button
  const accountBtn = document.getElementById('alreadyHaveAccount');
  if (accountBtn) {
    accountBtn.addEventListener('click', function() {
      // Go to login (slide 4)
      window.onboardingSwiper.slideTo(3);
    });
  }
  
  // Create account button
  const createBtn = document.getElementById('createAccountBtn');
  if (createBtn) {
    createBtn.addEventListener('click', function() {
      const username = document.getElementById('registerUsername').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      
      if (username && email && password) {
        // Very simple validation - a real app would do more
        if (email.includes('@') && password.length >= 6) {
          // For this version, just store locally that they've registered
          // In a real app, you would connect to Firebase Auth here
          localStorage.setItem('medswipeRegistered', 'true');
          localStorage.setItem('medswipeUsername', username);
          completeOnboarding();
        } else {
          alert('Please enter a valid email and a password with at least 6 characters.');
        }
      } else {
        alert('Please fill in all fields.');
      }
    });
  }
  
  // Skip registration button
  const skipBtn = document.getElementById('skipRegistration');
  if (skipBtn) {
    skipBtn.addEventListener('click', function() {
      completeOnboarding();
    });
  }
}

// Complete onboarding and go to dashboard
function completeOnboarding() {
  // Mark onboarding as complete
  localStorage.setItem('medswipeOnboardingComplete', 'true');
  
  // Hide onboarding elements
  document.getElementById('onboardingSwiper').style.display = 'none';
  document.getElementById('onboardingToolbar').style.display = 'none';
  
  // Show dashboard
  document.getElementById('mainOptions').style.display = 'flex';
  
  // Update user menu to show registered username if available
  updateUserMenuAfterRegistration();
}

// Update user menu with registered username
function updateUserMenuAfterRegistration() {
  const registeredUsername = localStorage.getItem('medswipeUsername');
  
  if (registeredUsername) {
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
      usernameDisplay.textContent = registeredUsername;
    }
  }
}
