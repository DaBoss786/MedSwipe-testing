// --- START OF FILE app.js ---

// Add splash screen, welcome screen, and authentication-based routing
document.addEventListener('DOMContentLoaded', function() {
  const splashScreen = document.getElementById('splashScreen');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const mainOptions = document.getElementById('mainOptions');

  // Immediately hide the dashboard to prevent it from being visible at any point
  if (mainOptions) {
    mainOptions.style.display = 'none';
  }

  // Ensure welcome screen is ready but hidden
  if (welcomeScreen) {
    welcomeScreen.style.display = 'flex';
    welcomeScreen.style.opacity = '0';
  }

  // Listen for authentication state changes
  window.addEventListener('authStateChanged', function(event) {
    console.log('Auth state changed in app.js:', event.detail);

    // Once authentication is initialized and not loading
    if (!event.detail.isLoading) {
      // Hide splash screen after 2 seconds
      setTimeout(function() {
        if (splashScreen) {
          splashScreen.classList.add('fade-out');

          // After splash fades out, decide where to go based on auth state
          setTimeout(function() {
            splashScreen.style.display = 'none';

            if (event.detail.isRegistered) {
              // Registered user - go straight to dashboard
              console.log('User is registered, showing dashboard');
              if (mainOptions) {
                mainOptions.style.display = 'flex';

                // ***** CORRECTED PART: Initialize and set up dashboard HERE *****
                if (typeof initializeDashboard === 'function') {
                  initializeDashboard(); // Load dashboard data
                } else {
                  console.error("initializeDashboard function not found!");
                }
                if (typeof setupDashboardEvents === 'function') {
                  setupDashboardEvents(); // Attach dashboard event listeners
                } else {
                  console.error("setupDashboardEvents function not found!");
                }
                // ***** END OF CORRECTION *****

              }
            } else {
              // Guest user - show welcome screen
              console.log('User is guest, showing welcome screen');
              if (welcomeScreen) {
                welcomeScreen.style.opacity = '1';
              }
            }
          }, 500); // Matches the transition duration in CSS
        }
      }, 2000);
    }
  });

  // Handle welcome screen buttons
  const startLearningBtn = document.getElementById('startLearningBtn');
  const existingAccountBtn = document.getElementById('existingAccountBtn');

  if (startLearningBtn) {
    startLearningBtn.addEventListener('click', function() {
      welcomeScreen.style.opacity = '0';
      setTimeout(function() {
        welcomeScreen.style.display = 'none';
        mainOptions.style.display = 'flex';
        // Initialize and setup dashboard when coming from welcome screen too
        if (typeof initializeDashboard === 'function') {
          initializeDashboard();
        }
        if (typeof setupDashboardEvents === 'function') {
          setupDashboardEvents();
        }
      }, 500);
    });
  }

  if (existingAccountBtn) {
    existingAccountBtn.addEventListener('click', function() {
      welcomeScreen.style.opacity = '0';
      setTimeout(function() {
        welcomeScreen.style.display = 'none';
        // Show the new login screen instead of the old modal
        if (typeof window.showLoginScreen === 'function') {
          window.showLoginScreen();
        } else {
          // Fallback to the old login form if the new one isn't available
          showLoginForm();
        }
      }, 500);
    });
  }
});

// Function to show the login form modal (Old fallback, prefer login-screen.js)
function showLoginForm() {
  // Create login modal if it doesn't exist
  let loginModal = document.getElementById('loginModal');

  if (!loginModal) {
    loginModal = document.createElement('div');
    loginModal.id = 'loginModal';
    loginModal.className = 'auth-modal';

    loginModal.innerHTML = `
  <div class="auth-modal-content">
    <img src="MedSwipe Logo gradient.png" alt="MedSwipe Logo" class="auth-logo">
    <h2>Log In to MedSwipe</h2>
    <div id="loginError" class="auth-error"></div>
    <form id="loginForm">
      <div class="form-group">
        <label for="loginEmail">Email</label>
        <input type="email" id="loginEmail" required>
      </div>
      <div class="form-group">
        <label for="loginPassword">Password</label>
        <input type="password" id="loginPassword" required>
      </div>
      <div class="auth-buttons">
        <button type="submit" class="auth-primary-btn">Log In</button>
        <button type="button" id="createAccountBtnLoginModal" class="auth-secondary-btn">Create Account</button>
      </div>
    </form>
    <button id="closeLoginBtn" class="auth-close-btn">×</button>
  </div>
`;

    document.body.appendChild(loginModal);

    // Add event listeners
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const errorElement = document.getElementById('loginError');

      try {
        errorElement.textContent = '';
        await window.authFunctions.loginUser(email, password);
        // Success - close modal and show dashboard
        loginModal.style.display = 'none';
        document.getElementById('mainOptions').style.display = 'flex';
        // Initialize and setup dashboard after successful login
        if (typeof initializeDashboard === 'function') {
          initializeDashboard();
        }
        if (typeof setupDashboardEvents === 'function') {
          setupDashboardEvents();
        }
      } catch (error) {
        // Show error message
        errorElement.textContent = getAuthErrorMessage(error);
      }
    });

    // Make sure button ID is unique if using login-screen.js as well
    document.getElementById('createAccountBtnLoginModal').addEventListener('click', function() {
      loginModal.style.display = 'none';
      showRegisterForm();
    });

    document.getElementById('closeLoginBtn').addEventListener('click', function() {
      loginModal.style.display = 'none';
      // Ensure dashboard is shown if user closes login without logging in
      const mainOptions = document.getElementById('mainOptions');
      if (mainOptions.style.display === 'none') {
         mainOptions.style.display = 'flex';
         if (typeof initializeDashboard === 'function') {
            initializeDashboard();
         }
         if (typeof setupDashboardEvents === 'function') {
            setupDashboardEvents();
         }
      }
    });
  }

  // Show the modal
  loginModal.style.display = 'flex';
}

// Function to show the registration form modal (Old fallback)
function showRegisterForm() {
  // Create registration modal if it doesn't exist
  let registerModal = document.getElementById('registerModal');

  if (!registerModal) {
    registerModal = document.createElement('div');
    registerModal.id = 'registerModal';
    registerModal.className = 'auth-modal';

    registerModal.innerHTML = `
  <div class="auth-modal-content">
    <img src="MedSwipe Logo gradient.png" alt="MedSwipe Logo" class="auth-logo">
    <h2>Create MedSwipe Account</h2>
    <div id="registerError" class="auth-error"></div>
    <form id="registerForm">
      <div class="form-group">
        <label for="registerUsername">Username</label>
        <input type="text" id="registerUsername" required>
      </div>
      <div class="form-group">
        <label for="registerExperience">Experience Level</label>
        <select id="registerExperience" required>
          <option value="" disabled selected>Select your experience level</option>
          <option value="Medical Student">Medical Student</option>
          <option value="PGY 1-2">PGY 1-2</option>
          <option value="PGY 3-4">PGY 3-4</option>
          <option value="PGY 5+">PGY 5+</option>
          <option value="Attending">Attending</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="registerEmail">Email</label>
        <input type="email" id="registerEmail" required>
      </div>
      <div class="form-group">
        <label for="registerPassword">Password</label>
        <input type="password" id="registerPassword" required minlength="6">
        <small>Password must be at least 6 characters</small>
      </div>
      <div class="auth-buttons">
        <button type="submit" class="auth-primary-btn">Create Account</button>
        <button type="button" id="goToLoginBtn" class="auth-secondary-btn">I Already Have an Account</button>
      </div>
    </form>
    <button id="closeRegisterBtn" class="auth-close-btn">×</button>
  </div>
`;

    document.body.appendChild(registerModal);

    // Add event listeners
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      const username = document.getElementById('registerUsername').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const experience = document.getElementById('registerExperience').value;
      const errorElement = document.getElementById('registerError');

      try {
        errorElement.textContent = '';

        if (window.authState.user && window.authState.user.isAnonymous) {
          // Upgrade anonymous user
          await window.authFunctions.upgradeAnonymousUser(email, password, username, experience);
        } else {
          // Create new user
          await window.authFunctions.registerUser(email, password, username, experience);
        }

        // Success - close modal and show dashboard
        registerModal.style.display = 'none';
        document.getElementById('mainOptions').style.display = 'flex';
        // Initialize and setup dashboard after successful registration/upgrade
        if (typeof initializeDashboard === 'function') {
            initializeDashboard();
        }
        if (typeof setupDashboardEvents === 'function') {
            setupDashboardEvents();
        }
      } catch (error) {
        // Show error message
        errorElement.textContent = getAuthErrorMessage(error);
      }
    });

    document.getElementById('goToLoginBtn').addEventListener('click', function() {
      registerModal.style.display = 'none';
      if (typeof window.showLoginScreen === 'function') {
        window.showLoginScreen();
      } else {
        showLoginForm();
      }
    });

    document.getElementById('closeRegisterBtn').addEventListener('click', function() {
      registerModal.style.display = 'none';
       // Ensure dashboard is shown if user closes register without registering
       const mainOptions = document.getElementById('mainOptions');
       if (mainOptions.style.display === 'none') {
          mainOptions.style.display = 'flex';
          if (typeof initializeDashboard === 'function') {
             initializeDashboard();
          }
          if (typeof setupDashboardEvents === 'function') {
             setupDashboardEvents();
          }
       }
    });
  }

  // Show the modal
  registerModal.style.display = 'flex';
}

// Helper function to get user-friendly error messages
function getAuthErrorMessage(error) {
  const errorCode = error.code;

  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address format';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/network-request-failed':
      return 'Network error - please check your connection';
    case 'auth/too-many-requests': // Added from login-screen.js
      return 'Too many attempts. Please try again later.';
    default:
      return error.message || 'An unknown error occurred';
  }
}

// General UI event listeners - This block is kept but auth/dashboard init removed
window.addEventListener('load', function() {
  // Ensure functions are globally available (fallback)
  window.updateUserXP = window.updateUserXP || function() { console.log("updateUserXP not loaded yet"); };
  window.updateUserMenu = window.updateUserMenu || function() { console.log("updateUserMenu not loaded yet"); };

  // Initialize user menu display (will be updated by auth state change)
  // The checkAuthAndInit function is removed as auth changes handle this.
  // window.updateUserMenu(); // Call directly if needed initially, but auth state change is better

  // Score circle click => open user menu
  const scoreCircle = document.getElementById("scoreCircle");
  if (scoreCircle) {
    scoreCircle.addEventListener("click", function() {
      const userMenu = document.getElementById("userMenu");
      const menuOverlay = document.getElementById("menuOverlay");
      if (userMenu && menuOverlay) {
        userMenu.classList.add("open");
        menuOverlay.classList.add("show");
      }
    });
  }

  // User menu score circle click => go to FAQ
  const userScoreCircle = document.getElementById("userScoreCircle");
  if (userScoreCircle) {
    userScoreCircle.addEventListener("click", function() {
      closeUserMenu();
      showFAQ();
    });
  }

  // User menu close button
  const userMenuClose = document.getElementById("userMenuClose");
  if (userMenuClose) {
    userMenuClose.addEventListener("click", function() {
      closeUserMenu();
    });
  }

  // Performance from user menu
  const performanceItemUser = document.getElementById("performanceItemUser");
  if (performanceItemUser) {
    performanceItemUser.addEventListener("click", function() {
      closeUserMenu();
      // Ensure displayPerformance is available
      if(typeof displayPerformance === 'function'){
        displayPerformance();
      } else {
         console.error("displayPerformance function not found");
      }
    });
  }

  // Bookmarks from user menu - start a bookmarks-only quiz
  const bookmarksFilterUser = document.getElementById("bookmarksFilterUser");
  if (bookmarksFilterUser) {
    bookmarksFilterUser.addEventListener("click", function(e) {
      e.preventDefault();
      closeUserMenu();
      // Ensure loadQuestions is available
      if(typeof loadQuestions === 'function'){
        loadQuestions({
          bookmarksOnly: true,
          num: 50 // Large number to include all bookmarks
        });
      } else {
         console.error("loadQuestions function not found");
      }
    });
  }

  // Reset progress from user menu
  const resetProgressUser = document.getElementById("resetProgressUser");
  if (resetProgressUser) {
    resetProgressUser.addEventListener("click", async function(e) {
      e.preventDefault();
      const confirmReset = confirm("Are you sure you want to reset all progress?");
      if (!confirmReset) return;

      if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction) {
        alert("System not ready. Please try again later.");
        return;
      }

      const uid = window.auth.currentUser.uid;
      const userDocRef = window.doc(window.db, 'users', uid);
      try {
        await window.runTransaction(window.db, async (transaction) => {
          const userDoc = await transaction.get(userDocRef);
          if (userDoc.exists()) {
            let data = userDoc.data();
            data.answeredQuestions = {};
            data.stats = { totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0, categories: {}, totalTimeSpent: 0, xp: 0, level: 1, achievements: {}, currentCorrectStreak: 0 }; // Reset XP/Level/Achievements too
            data.streaks = { lastAnsweredDate: null, currentStreak: 0, longestStreak: 0 };
            data.spacedRepetition = {}; // Reset spaced repetition
            transaction.set(userDocRef, data, { merge: true });
          }
        });
        alert("Progress has been reset!");
        // Ensure updates happen after reset
        if (typeof window.updateUserXP === 'function') window.updateUserXP();
        if (typeof window.updateUserMenu === 'function') window.updateUserMenu();
        if (typeof initializeDashboard === 'function') initializeDashboard();

      } catch (error) {
        console.error("Error resetting progress:", error);
        alert("There was an error resetting your progress.");
      }
      closeUserMenu();
    });
  }

  // CUSTOM QUIZ BUTTON => show modal
  const customQuizBtn = document.getElementById("customQuizBtn");
  if (customQuizBtn) {
    customQuizBtn.addEventListener("click", function() {
      window.filterMode = "all";
      closeSideMenu();
      const customQuizForm = document.getElementById("customQuizForm");
      if (customQuizForm) customQuizForm.style.display = "block";
      // Hide other views if needed
      const aboutView = document.getElementById("aboutView");
      if (aboutView) aboutView.style.display = "none";
      const faqView = document.getElementById("faqView");
      if (faqView) faqView.style.display = "none";
    });
  }

  // RANDOM QUIZ BUTTON => show modal
  const randomQuizBtn = document.getElementById("randomQuizBtn");
  if (randomQuizBtn) {
    randomQuizBtn.addEventListener("click", function() {
      window.filterMode = "all";
      closeSideMenu();
      const randomQuizForm = document.getElementById("randomQuizForm");
      if (randomQuizForm) randomQuizForm.style.display = "block";
       // Hide other views if needed
      const aboutView = document.getElementById("aboutView");
      if (aboutView) aboutView.style.display = "none";
      const faqView = document.getElementById("faqView");
      if (faqView) faqView.style.display = "none";
    });
  }

  // START QUIZ (Custom) => hide modal, load quiz
  const startCustomQuiz = document.getElementById("startCustomQuiz");
  if (startCustomQuiz) {
    startCustomQuiz.addEventListener("click", function() {
      const categorySelect = document.getElementById("categorySelect");
      const customNumQuestions = document.getElementById("customNumQuestions");
      const includeAnsweredCheckbox = document.getElementById("includeAnsweredCheckbox");
      const useSpacedRepetitionCheckbox = document.getElementById("customSpacedRepetition"); // Assuming ID exists

      let category = categorySelect ? categorySelect.value : "";
      let numQuestions = customNumQuestions ? parseInt(customNumQuestions.value) || 10 : 10;
      let includeAnswered = includeAnsweredCheckbox ? includeAnsweredCheckbox.checked : false;
      let useSpacedRepetition = useSpacedRepetitionCheckbox ? useSpacedRepetitionCheckbox.checked : false;

      const customQuizForm = document.getElementById("customQuizForm");
      if (customQuizForm) customQuizForm.style.display = "none";

      if(typeof loadQuestions === 'function'){
        loadQuestions({
          type: 'custom',
          category: category,
          num: numQuestions,
          includeAnswered: includeAnswered,
          spacedRepetition: useSpacedRepetition
        });
      } else {
         console.error("loadQuestions function not found");
      }
    });
  }

  // CANCEL QUIZ (Custom)
  const cancelCustomQuiz = document.getElementById("cancelCustomQuiz");
  if (cancelCustomQuiz) {
    cancelCustomQuiz.addEventListener("click", function() {
      const customQuizForm = document.getElementById("customQuizForm");
      if (customQuizForm) customQuizForm.style.display = "none";
    });
  }

  // START QUIZ (Random) => hide modal, load quiz
  const startRandomQuiz = document.getElementById("startRandomQuiz");
  if (startRandomQuiz) {
    startRandomQuiz.addEventListener("click", function() {
      const randomNumQuestions = document.getElementById("randomNumQuestions");
      const includeAnsweredRandomCheckbox = document.getElementById("includeAnsweredRandomCheckbox");
      const useSpacedRepetitionCheckbox = document.getElementById("randomSpacedRepetition"); // Assuming ID exists

      let numQuestions = randomNumQuestions ? parseInt(randomNumQuestions.value) || 10 : 10;
      let includeAnswered = includeAnsweredRandomCheckbox ? includeAnsweredRandomCheckbox.checked : false;
      let useSpacedRepetition = useSpacedRepetitionCheckbox ? useSpacedRepetitionCheckbox.checked : false;

      const randomQuizForm = document.getElementById("randomQuizForm");
      if (randomQuizForm) randomQuizForm.style.display = "none";

      if(typeof loadQuestions === 'function'){
        loadQuestions({
          type: 'random',
          num: numQuestions,
          includeAnswered: includeAnswered,
          spacedRepetition: useSpacedRepetition
        });
      } else {
         console.error("loadQuestions function not found");
      }
    });
  }

  // CANCEL QUIZ (Random)
  const cancelRandomQuiz = document.getElementById("cancelRandomQuiz");
  if (cancelRandomQuiz) {
    cancelRandomQuiz.addEventListener("click", function() {
      const randomQuizForm = document.getElementById("randomQuizForm");
      if (randomQuizForm) randomQuizForm.style.display = "none";
    });
  }

  // BOOKMARKS => now simply close the menu
  const bookmarksFilter = document.getElementById("bookmarksFilter");
  if (bookmarksFilter) {
    bookmarksFilter.addEventListener("click", function(e) {
      e.preventDefault();
      closeSideMenu();
    });
  }

  // START NEW QUIZ from side menu (Go to Main Options/Dashboard)
  const startNewQuiz = document.getElementById("startNewQuiz");
  if (startNewQuiz) {
    startNewQuiz.addEventListener("click", function() {
      closeSideMenu();
      window.filterMode = "all";

      const swiperElement = document.querySelector(".swiper");
      if (swiperElement) swiperElement.style.display = "none";

      const bottomToolbar = document.getElementById("bottomToolbar");
      if (bottomToolbar) bottomToolbar.style.display = "none";

      const iconBar = document.getElementById("iconBar");
      if (iconBar) iconBar.style.display = "none";

      const performanceView = document.getElementById("performanceView");
      if (performanceView) performanceView.style.display = "none";

      const leaderboardView = document.getElementById("leaderboardView");
      if (leaderboardView) leaderboardView.style.display = "none";

      const faqView = document.getElementById("faqView");
      if (faqView) faqView.style.display = "none";

      const aboutView = document.getElementById("aboutView");
      if (aboutView) aboutView.style.display = "none";

      const mainOptions = document.getElementById("mainOptions");
      if (mainOptions) mainOptions.style.display = "flex";

      // Make sure dashboard is initialized when navigating back
      if (typeof initializeDashboard === 'function') initializeDashboard();
      if (typeof setupDashboardEvents === 'function') setupDashboardEvents();
    });
  }

  // LEADERBOARD
  const leaderboardItem = document.getElementById("leaderboardItem");
  if (leaderboardItem) {
    leaderboardItem.addEventListener("click", function() {
      closeSideMenu();
      if(typeof showLeaderboard === 'function') showLeaderboard();
    });
  }

  // FAQ
  const faqItem = document.getElementById("faqItem");
  if (faqItem) {
    faqItem.addEventListener("click", function() {
      closeSideMenu();
       if(typeof showFAQ === 'function') showFAQ();
    });
  }

  // ABOUT US
  const aboutItem = document.getElementById("aboutItem");
  if (aboutItem) {
    aboutItem.addEventListener("click", function() {
      closeSideMenu();
       if(typeof showAbout === 'function') showAbout();
    });
  }

  // CONTACT US
  const contactItem = document.getElementById("contactItem");
  if (contactItem) {
    contactItem.addEventListener("click", function() {
      closeSideMenu();

      const swiperElement = document.querySelector(".swiper");
      if (swiperElement) swiperElement.style.display = "none";
      const bottomToolbar = document.getElementById("bottomToolbar");
      if (bottomToolbar) bottomToolbar.style.display = "none";
      const iconBar = document.getElementById("iconBar");
      if (iconBar) iconBar.style.display = "none";
      const performanceView = document.getElementById("performanceView");
      if (performanceView) performanceView.style.display = "none";
      const leaderboardView = document.getElementById("leaderboardView");
      if (leaderboardView) leaderboardView.style.display = "none";
      const aboutView = document.getElementById("aboutView");
      if (aboutView) aboutView.style.display = "none";
      const faqView = document.getElementById("faqView");
      if (faqView) faqView.style.display = "none";
      const mainOptions = document.getElementById("mainOptions");
      if (mainOptions) mainOptions.style.display = "none";

      if(typeof showContactModal === 'function') showContactModal();
    });
  }

  // Side menu toggling
  const menuToggle = document.getElementById("menuToggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", function() {
      const sideMenu = document.getElementById("sideMenu");
      const menuOverlay = document.getElementById("menuOverlay");
      if (sideMenu) sideMenu.classList.add("open");
      if (menuOverlay) menuOverlay.classList.add("show");
    });
  }

  const menuClose = document.getElementById("menuClose");
  if (menuClose) {
    menuClose.addEventListener("click", function() {
      closeSideMenu();
    });
  }

  const menuOverlay = document.getElementById("menuOverlay");
  if (menuOverlay) {
    menuOverlay.addEventListener("click", function() {
      closeSideMenu();
      closeUserMenu(); // Also close user menu if overlay is clicked
    });
  }

  // Logo click => go to main menu/dashboard
  const logoClick = document.getElementById("logoClick");
  if (logoClick) {
    logoClick.addEventListener("click", function() {
      closeSideMenu();
      closeUserMenu();

      const aboutView = document.getElementById("aboutView");
      if (aboutView) aboutView.style.display = "none";
      const faqView = document.getElementById("faqView");
      if (faqView) faqView.style.display = "none";
      const swiperElement = document.querySelector(".swiper");
      if (swiperElement) swiperElement.style.display = "none";
      const bottomToolbar = document.getElementById("bottomToolbar");
      if (bottomToolbar) bottomToolbar.style.display = "none";
      const iconBar = document.getElementById("iconBar");
      if (iconBar) iconBar.style.display = "none";
      const performanceView = document.getElementById("performanceView");
      if (performanceView) performanceView.style.display = "none";
      const leaderboardView = document.getElementById("leaderboardView");
      if (leaderboardView) leaderboardView.style.display = "none";

      const mainOptions = document.getElementById("mainOptions");
      if (mainOptions) mainOptions.style.display = "flex";

      // Make sure dashboard is initialized when navigating back
      if (typeof initializeDashboard === 'function') initializeDashboard();
      if (typeof setupDashboardEvents === 'function') setupDashboardEvents();
    });
  }

  // FEEDBACK button (in quiz view)
  const feedbackButton = document.getElementById("feedbackButton");
  if (feedbackButton) {
    feedbackButton.addEventListener("click", function() {
      const questionId = typeof getCurrentQuestionId === 'function' ? getCurrentQuestionId() : null;
      let questionText = "";
      if (questionId){
        const questionSlide = document.querySelector(`.swiper-slide[data-id="${questionId}"]`);
        if (questionSlide) {
          const questionElem = questionSlide.querySelector(".question");
          if (questionElem) {
            questionText = questionElem.textContent.trim();
          }
        }
      }
      // Assign to global variables (assuming they exist)
      window.currentFeedbackQuestionId = questionId || "";
      window.currentFeedbackQuestionText = questionText || "";

      const feedbackQuestionInfo = document.getElementById("feedbackQuestionInfo");
      if (feedbackQuestionInfo) feedbackQuestionInfo.textContent = `Feedback for Q: ${window.currentFeedbackQuestionText}`;

      const feedbackModal = document.getElementById("feedbackModal");
      if (feedbackModal) feedbackModal.style.display = "flex";
    });
  }

  // FEEDBACK modal close
  const closeFeedbackModal = document.getElementById("closeFeedbackModal");
  if (closeFeedbackModal) {
    closeFeedbackModal.addEventListener("click", function() {
      const feedbackModal = document.getElementById("feedbackModal");
      if (feedbackModal) feedbackModal.style.display = "none";
    });
  }

  // FEEDBACK submit
  const submitFeedback = document.getElementById("submitFeedback");
  if (submitFeedback) {
    submitFeedback.addEventListener("click", async function() {
      const feedbackTextElement = document.getElementById("feedbackText");
      const feedbackText = feedbackTextElement ? feedbackTextElement.value.trim() : "";

      if (!feedbackText) {
        alert("Please enter your feedback.");
        return;
      }

      if (!window.db || !window.addDoc || !window.collection || !window.serverTimestamp) {
         alert("System not ready. Please try again later.");
         return;
      }

      try {
        await window.addDoc(window.collection(window.db, "feedback"), {
          questionId: window.currentFeedbackQuestionId || "",
          questionText: window.currentFeedbackQuestionText || "",
          feedback: feedbackText,
          timestamp: window.serverTimestamp()
        });
        alert("Thank you for your feedback!");

        if (feedbackTextElement) feedbackTextElement.value = "";
        const feedbackModal = document.getElementById("feedbackModal");
        if (feedbackModal) feedbackModal.style.display = "none";
      } catch (error) {
        console.error("Error submitting feedback:", error);
        alert("There was an error submitting your feedback. Please try again later.");
      }
    });
  }

  // FAVORITE button (bookmark functionality - in quiz view)
  const favoriteButton = document.getElementById("favoriteButton");
  if (favoriteButton) {
    favoriteButton.addEventListener("click", async function() {
      let questionId = typeof getCurrentQuestionId === 'function' ? getCurrentQuestionId() : null;
      if (!questionId) return;

      if(typeof toggleBookmark !== 'function'){
         console.error("toggleBookmark function not found");
         return;
      }

      const isNowBookmarked = await toggleBookmark(questionId.trim());
      if (isNowBookmarked) {
        favoriteButton.innerText = "★";
        favoriteButton.style.color = "#007BFF"; // Blue
      } else {
        favoriteButton.innerText = "☆";
        favoriteButton.style.color = "";
      }
    });
  }

  // CONTACT modal buttons
  const submitContact = document.getElementById("submitContact");
  if (submitContact) {
    submitContact.addEventListener("click", async function() {
      const contactEmailElement = document.getElementById("contactEmail");
      const contactMessageElement = document.getElementById("contactMessage");
      const email = contactEmailElement ? contactEmailElement.value.trim() : "";
      const message = contactMessageElement ? contactMessageElement.value.trim() : "";

      if (!message) {
        alert("Please enter your message.");
        return;
      }

      if (!window.auth || !window.auth.currentUser || !window.db || !window.addDoc || !window.collection || !window.serverTimestamp) {
        alert("System not ready. Please try again later.");
        return;
      }

      try {
        await window.addDoc(window.collection(window.db, "contact"), {
          email: email,
          message: message,
          timestamp: window.serverTimestamp(),
          userId: window.auth.currentUser.uid
        });
        alert("Thank you for contacting us!");

        if (contactEmailElement) contactEmailElement.value = "";
        if (contactMessageElement) contactMessageElement.value = "";

        const contactModal = document.getElementById("contactModal");
        if (contactModal) contactModal.style.display = "none";
      } catch (error) {
        console.error("Error submitting contact:", error);
        alert("There was an error submitting your message. Please try again later.");
      }
    });
  }

  const closeContactModal = document.getElementById("closeContactModal");
  if (closeContactModal) {
    closeContactModal.addEventListener("click", function() {
      const contactModal = document.getElementById("contactModal");
      if (contactModal) contactModal.style.display = "none";
    });
  }

  // Clean up any existing LEVEL UP text on page load
  const textNodes = document.querySelectorAll('body > *:not([id])');
  textNodes.forEach(node => {
    if (node.textContent && node.textContent.includes('LEVEL UP')) {
      node.remove();
    }
  });
});

// Function to update the level progress circles and bar
function updateLevelProgress(percent) {
  // Update the level progress circles
  const levelCircleProgress = document.getElementById("levelCircleProgress"); // Top bar
  const userLevelProgress = document.getElementById("userLevelProgress"); // User menu
  const dashboardLevelProgress = document.getElementById("dashboardLevelProgress"); // Dashboard card

  if (levelCircleProgress) levelCircleProgress.style.setProperty('--progress', `${percent}%`);
  if (userLevelProgress) userLevelProgress.style.setProperty('--progress', `${percent}%`);
  if (dashboardLevelProgress) dashboardLevelProgress.style.setProperty('--progress', `${percent}%`);


  // Update the horizontal progress bar in user menu
  const levelProgressBar = document.getElementById("levelProgressBar");
  if (levelProgressBar) {
    levelProgressBar.style.width = `${percent}%`;
  }
}

// Update user XP display function call (Try after DOM content loaded)
document.addEventListener('DOMContentLoaded', function() {
  // Delay slightly to ensure auth state might be ready
  setTimeout(() => {
    if (typeof window.updateUserXP === 'function') {
      window.updateUserXP();
    }
  }, 500);
});

// Function to check if a user's streak should be reset due to inactivity
async function checkAndUpdateStreak() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction) {
    console.log("System not ready for streak check");
    return;
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);

    await window.runTransaction(window.db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists()) return;

      const data = userDoc.data();
      if (!data.streaks || !data.streaks.lastAnsweredDate) return;

      const currentDate = new Date();
      const lastDate = new Date(data.streaks.lastAnsweredDate);

      // Normalize dates to remove time component
      const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const normalizedCurrent = normalizeDate(currentDate);
      const normalizedLast = normalizeDate(lastDate);

      // Calculate difference in days
      const diffDays = Math.round((normalizedCurrent - normalizedLast) / (1000 * 60 * 60 * 24));

      // If more than 1 day has passed, reset the streak
      if (diffDays > 1) {
        console.log("Streak reset due to inactivity. Days since last activity:", diffDays);
        data.streaks.currentStreak = 0;
        transaction.set(userDocRef, data, { merge: true });

        // Update UI to show reset streak in dashboard
        const currentStreakElement = document.getElementById("currentStreak");
        if (currentStreakElement) currentStreakElement.textContent = "0";
        fixStreakCalendar(data.streaks); // Update calendar display
      }
    });
  } catch (error) {
    console.error("Error checking streak:", error);
  }
}

// Function to load leaderboard preview data
async function loadLeaderboardPreview() {
  const leaderboardPreview = document.getElementById("leaderboardPreview");
  if (!leaderboardPreview) return;

  if (!window.auth || !window.auth.currentUser || !window.db || !window.getDocs || !window.collection) {
    leaderboardPreview.innerHTML = '<div class="leaderboard-loading">System not ready</div>';
    return;
  }

  leaderboardPreview.innerHTML = '<div class="leaderboard-loading">Loading...</div>'; // Show loading state

  try {
    const currentUid = window.auth.currentUser.uid;
    const querySnapshot = await window.getDocs(window.collection(window.db, 'users'));
    let leaderboardEntries = [];

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.stats) {
        let xp = data.stats.xp || 0;
        leaderboardEntries.push({
          uid: docSnap.id,
          username: data.username || "Anonymous",
          xp: xp
        });
      }
    });

    // Sort by XP (descending)
    leaderboardEntries.sort((a, b) => b.xp - a.xp);

    // Get top 3
    let top3 = leaderboardEntries.slice(0, 3);

    // Find current user's position if not in top 3
    let currentUserRank = -1;
    let currentUserEntry = null;
    for(let i=0; i < leaderboardEntries.length; i++){
        if(leaderboardEntries[i].uid === currentUid){
            currentUserRank = i + 1;
            currentUserEntry = leaderboardEntries[i];
            break;
        }
    }
    let showCurrentUser = currentUserRank > 3 && currentUserEntry;

    // Create HTML for the preview
    let html = '';

    if (top3.length === 0) {
      html = '<div class="leaderboard-loading">No leaderboard data yet</div>';
    } else {
      top3.forEach((entry, index) => {
        const isCurrentUser = entry.uid === currentUid;
        const rank = index + 1;
        html += `
          <div class="leaderboard-preview-entry ${isCurrentUser ? 'current-user-entry' : ''}">
            <div class="leaderboard-rank leaderboard-rank-${rank}">${rank}</div>
            <div class="leaderboard-user-info">
              <div class="leaderboard-username">${entry.username}${isCurrentUser ? ' (You)' : ''}</div>
              <div class="leaderboard-user-xp">${entry.xp} XP</div>
            </div>
          </div>
        `;
      });

      // Add current user's entry if not in top 3
      if (showCurrentUser) {
        html += `
          <div class="leaderboard-preview-entry current-user-entry">
            <div class="leaderboard-rank">${currentUserRank}</div>
            <div class="leaderboard-user-info">
              <div class="leaderboard-username">${currentUserEntry.username} (You)</div>
              <div class="leaderboard-user-xp">${currentUserEntry.xp} XP</div>
            </div>
          </div>
        `;
      }
    }
    leaderboardPreview.innerHTML = html;

  } catch (error) {
    console.error("Error loading leaderboard preview:", error);
    leaderboardPreview.innerHTML = '<div class="leaderboard-loading">Error loading leaderboard</div>';
  }
}

// Dashboard initialization and functionality
async function initializeDashboard() {
    const mainOptions = document.getElementById("mainOptions");
    if (!mainOptions || mainOptions.style.display === 'none') {
        // Don't initialize if the dashboard isn't visible
        return;
    }

    console.log("Initializing dashboard..."); // Log start

    if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) {
        console.log("System not ready for dashboard initialization");
        // Optionally retry or show an error
        return;
    }

    try {
        const uid = window.auth.currentUser.uid;
        const userDocRef = window.doc(window.db, 'users', uid);
        const userDocSnap = await window.getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const stats = data.stats || {};
            const streaks = data.streaks || { currentStreak: 0 };

            // Update level and XP display
            const xp = stats.xp || 0;
            const level = stats.level || 1;
            const progress = typeof calculateLevelProgress === 'function' ? calculateLevelProgress(xp) : 0;

            // Set level number
            const dashboardLevel = document.getElementById("dashboardLevel");
            if (dashboardLevel) dashboardLevel.textContent = level;

            // Set XP display
            const dashboardXP = document.getElementById("dashboardXP");
            if (dashboardXP) dashboardXP.textContent = `${xp} XP`;

            // Set next level info
            const dashboardNextLevel = document.getElementById("dashboardNextLevel");
            if (dashboardNextLevel) {
                const levelInfo = typeof getLevelInfo === 'function' ? getLevelInfo(level) : { nextLevelXp: null };
                if (levelInfo.nextLevelXp !== null) {
                    const xpNeeded = levelInfo.nextLevelXp - xp;
                    dashboardNextLevel.textContent = `${xpNeeded} XP to Level ${level + 1}`;
                } else {
                    dashboardNextLevel.textContent = 'Max Level Reached!';
                }
            }

            // Update progress circle
            const dashboardLevelProgress = document.getElementById("dashboardLevelProgress");
            if (dashboardLevelProgress) dashboardLevelProgress.style.setProperty('--progress', `${progress}%`);

            // Update quick stats
            const totalAnswered = stats.totalAnswered || 0;
            const totalCorrect = stats.totalCorrect || 0;
            const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

            const dashboardAnswered = document.getElementById("dashboardAnswered");
            if (dashboardAnswered) dashboardAnswered.textContent = totalAnswered;

            const dashboardAccuracy = document.getElementById("dashboardAccuracy");
            if (dashboardAccuracy) dashboardAccuracy.textContent = `${accuracy}%`;

            // Update streak display
            const currentStreakElement = document.getElementById("currentStreak"); // Renamed variable
            if (currentStreakElement) {
                currentStreakElement.textContent = streaks.currentStreak || 0;
            }

            // Generate streak calendar
            if (typeof fixStreakCalendar === 'function') fixStreakCalendar(streaks);


            // Load leaderboard preview
            if (typeof loadLeaderboardPreview === 'function') loadLeaderboardPreview();

            // Load review queue data
            if (typeof updateReviewQueue === 'function') updateReviewQueue();

            console.log("Dashboard initialized successfully."); // Log success

        } else {
             console.log("User document does not exist for dashboard init.");
        }
    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}


// Function to count questions due for review today
async function countDueReviews() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) {
    console.log("System not ready for counting reviews");
    return { dueCount: 0, nextReviewDate: null };
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return { dueCount: 0, nextReviewDate: null };
    }

    const data = userDocSnap.data();
    const spacedRepetitionData = data.spacedRepetition || {};

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let dueCount = 0;
    let nextReviewDate = null;

    for (const questionId in spacedRepetitionData) {
      const reviewData = spacedRepetitionData[questionId];
      if (!reviewData || !reviewData.nextReviewDate) continue;

      try {
        const reviewDate = new Date(reviewData.nextReviewDate);
        // Check if reviewDate is valid
        if (isNaN(reviewDate.getTime())) {
           console.warn(`Invalid nextReviewDate found for question ${questionId}:`, reviewData.nextReviewDate);
           continue; // Skip this invalid entry
        }

        const reviewDateOnly = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());

        if (reviewDateOnly <= today) {
          dueCount++;
        } else if (reviewDateOnly >= tomorrow && (!nextReviewDate || reviewDateOnly < nextReviewDate)) {
          nextReviewDate = reviewDateOnly;
        }
      } catch (dateError) {
         console.warn(`Error parsing date for question ${questionId}:`, reviewData.nextReviewDate, dateError);
      }
    }
    return { dueCount, nextReviewDate };
  } catch (error) {
    console.error("Error counting due reviews:", error);
    return { dueCount: 0, nextReviewDate: null };
  }
}


// Function to update the Review Queue card in the dashboard
async function updateReviewQueue() {
  const reviewCountElement = document.getElementById("reviewCount"); // Renamed variable
  const reviewQueueContent = document.getElementById("reviewQueueContent");
  const reviewProgressBar = document.getElementById("reviewProgressBar");

  if (!reviewCountElement || !reviewQueueContent || !reviewProgressBar) return;

  try {
      const { dueCount, nextReviewDate } = await countDueReviews();

      reviewCountElement.textContent = dueCount;

      // Show/hide based on count
      const reviewStatsDiv = reviewQueueContent.querySelector(".review-stats");
      const emptyStateDiv = reviewQueueContent.querySelector(".review-empty-state");
      const progressContainer = reviewQueueContent.querySelector(".review-progress-container");

      if (dueCount > 0) {
          // Show stats and progress bar
          if (reviewStatsDiv) reviewStatsDiv.style.display = 'block';
          if (progressContainer) progressContainer.style.display = 'block';
          if (emptyStateDiv) emptyStateDiv.style.display = 'none'; // Hide empty state

          const progressPercent = Math.min(100, (dueCount / 20) * 100); // Assuming 20 is a good target
          reviewProgressBar.style.width = `${progressPercent}%`;

      } else {
          // Show empty state
          if (reviewStatsDiv) reviewStatsDiv.style.display = 'none'; // Hide stats
          if (progressContainer) progressContainer.style.display = 'none'; // Hide progress bar

          let emptyStateMessage = "";
          if (nextReviewDate) {
              const formattedDate = nextReviewDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              emptyStateMessage = `No reviews due today.<br>Next review: <span class="next-review-date">${formattedDate}</span>`;
          } else {
              emptyStateMessage = "No reviews scheduled. Complete quizzes to add reviews.";
          }

          if (emptyStateDiv) {
             emptyStateDiv.innerHTML = emptyStateMessage;
             emptyStateDiv.style.display = 'block';
          } else {
             // Create if it doesn't exist
             const newEmptyStateDiv = document.createElement("div");
             newEmptyStateDiv.className = "review-empty-state";
             newEmptyStateDiv.innerHTML = emptyStateMessage;
             reviewQueueContent.appendChild(newEmptyStateDiv);
          }
      }
  } catch (error) {
       console.error("Error updating review queue UI:", error);
  }
}


// Set up event listeners for dashboard cards and modals
function setupDashboardEvents() {
    console.log("Setting up dashboard event listeners..."); // Log start

    // Helper to prevent duplicate listeners
    const addClickListenerOnce = (elementId, handler) => {
        const element = document.getElementById(elementId);
        if (element && !element._hasClickListener) {
            element.addEventListener('click', handler);
            element._hasClickListener = true; // Mark as attached
            console.log(`Event listener attached to #${elementId}`);
        } else if(element) {
             console.log(`Event listener ALREADY attached to #${elementId}`);
        } else {
             console.warn(`Element #${elementId} not found for event listener.`);
        }
    };

    // --- Dashboard Buttons ---
    addClickListenerOnce("startQuizBtn", function() {
        const quizSetupModal = document.getElementById("quizSetupModal");
        if(quizSetupModal) quizSetupModal.style.display = "block";
    });

    // --- Quiz Setup Modal Buttons ---
    addClickListenerOnce("modalStartQuiz", function() {
        const category = document.getElementById("modalCategorySelect")?.value || "";
        const numQuestions = parseInt(document.getElementById("modalNumQuestions")?.value) || 10;
        const includeAnswered = document.getElementById("modalIncludeAnswered")?.checked || false;
        const useSpacedRepetition = document.getElementById("modalSpacedRepetition")?.checked || false;

        const quizSetupModal = document.getElementById("quizSetupModal");
        if(quizSetupModal) quizSetupModal.style.display = "none";

        if(typeof loadQuestions === 'function'){
            loadQuestions({
                type: category ? 'custom' : 'random',
                category: category,
                num: numQuestions,
                includeAnswered: includeAnswered,
                spacedRepetition: useSpacedRepetition
            });
        } else {
            console.error("loadQuestions function not found");
        }
    });

    addClickListenerOnce("modalCancelQuiz", function() {
        const quizSetupModal = document.getElementById("quizSetupModal");
        if(quizSetupModal) quizSetupModal.style.display = "none";
    });

    // --- Dashboard Card Clicks ---
    addClickListenerOnce("userProgressCard", function() {
        if(typeof displayPerformance === 'function') displayPerformance();
    });

    addClickListenerOnce("quickStatsCard", function() {
         if(typeof displayPerformance === 'function') displayPerformance();
    });

    addClickListenerOnce("leaderboardPreviewCard", function() {
        if(typeof showLeaderboard === 'function') showLeaderboard();
    });

    addClickListenerOnce("reviewQueueCard", async function() {
        if(typeof countDueReviews !== 'function' || typeof getDueQuestionIds !== 'function' || typeof loadSpecificQuestions !== 'function') {
            console.error("Required review functions not found");
            return;
        }

        const { dueCount } = await countDueReviews();
        if (dueCount === 0) {
            alert("You have no questions due for review today. Good job!");
            return;
        }

        const dueQuestionIds = await getDueQuestionIds();
        if (dueQuestionIds.length === 0) {
            alert("No questions found for review. Please try again later.");
            return;
        }
        loadSpecificQuestions(dueQuestionIds);
    });

     console.log("Dashboard event listeners setup complete."); // Log end
}


// Function to fix streak calendar alignment
function fixStreakCalendar(streaksData) { // Renamed parameter
    const streakCalendar = document.getElementById("streakCalendar");
    if (!streakCalendar) return;

    streakCalendar.innerHTML = ''; // Clear existing

    const today = new Date();
    let todayDayIndex = today.getDay() - 1; // 0=Mon, 6=Sun
    if (todayDayIndex < 0) todayDayIndex = 6;

    const currentStreak = streaksData?.currentStreak || 0;
    const lastAnsweredDateStr = streaksData?.lastAnsweredDate;
    let lastAnsweredDate = null;
    if(lastAnsweredDateStr) {
       try {
          lastAnsweredDate = new Date(lastAnsweredDateStr);
       } catch(e) { console.error("Invalid lastAnsweredDate:", lastAnsweredDateStr); }
    }

    for (let i = 0; i < 7; i++) {
        const offset = i - todayDayIndex;
        const date = new Date(today);
        date.setDate(today.getDate() + offset);

        const dayCircle = document.createElement("div");
        dayCircle.className = "day-circle";
        dayCircle.textContent = date.getDate();

        if (offset === 0) {
            dayCircle.classList.add("today");
        }

        // Check if this day should be active based on streak and last answered date
        if (currentStreak > 0 && lastAnsweredDate && !isNaN(lastAnsweredDate.getTime())) {
            // Normalize date to compare days correctly
            const normalize = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const normalizedDate = normalize(date);
            const normalizedLastAnswered = normalize(lastAnsweredDate);
            const normalizedToday = normalize(today);

            // Calculate day difference relative to the *last answered date*
            const diffFromLast = Math.round((normalizedLastAnswered - normalizedDate) / (1000 * 60 * 60 * 24));

            // Check if the date is within the current streak range *ending on the last answered date*
            // AND ensure the date is not in the future relative to today
            if (diffFromLast >= 0 && diffFromLast < currentStreak && normalizedDate <= normalizedToday) {
                dayCircle.classList.add("active");
            }
        }

        streakCalendar.appendChild(dayCircle);
    }
}


// Function to get IDs of questions due for review
async function getDueQuestionIds() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) {
    return [];
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);

    if (!userDocSnap.exists()) return [];

    const data = userDocSnap.data();
    const spacedRepetitionData = data.spacedRepetition || {};

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let dueQuestionIds = [];

    for (const questionId in spacedRepetitionData) {
      const reviewData = spacedRepetitionData[questionId];
      if (!reviewData || !reviewData.nextReviewDate) continue;

      try {
        const reviewDate = new Date(reviewData.nextReviewDate);
        if (isNaN(reviewDate.getTime())) continue; // Skip invalid dates

        const reviewDateOnly = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
        if (reviewDateOnly <= today) {
          dueQuestionIds.push(questionId);
        }
      } catch (e) {
         console.warn(`Error processing date for question ${questionId}:`, reviewData.nextReviewDate, e);
      }
    }
    return dueQuestionIds;
  } catch (error) {
    console.error("Error getting due question IDs:", error);
    return [];
  }
}

// Function to load only specific questions by ID
async function loadSpecificQuestions(questionIds) {
  if (!questionIds || questionIds.length === 0) {
    alert("No questions to review.");
    return;
  }

  console.log("Loading specific review questions:", questionIds.length);

  // Ensure PapaParse and csvUrl are available
  if (typeof Papa === 'undefined' || typeof csvUrl === 'undefined') {
     console.error("PapaParse or csvUrl not available for loadSpecificQuestions");
     alert("Error loading question data. Please try again.");
     return;
  }
   // Ensure shuffleArray and initializeQuiz are available
  if (typeof shuffleArray !== 'function' || typeof initializeQuiz !== 'function') {
     console.error("Required functions (shuffleArray, initializeQuiz) not available");
     alert("Error preparing quiz. Please try again.");
     return;
  }


  try {
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: function(results) {
        if (!results || !results.data) {
           console.error("Failed to parse CSV data.");
           alert("Error loading question data. Please try again.");
           return;
        }
        console.log("All questions loaded:", results.data.length);

        const reviewQuestions = results.data.filter(q =>
          q && q["Question"] && questionIds.includes(q["Question"].trim())
        );

        console.log("Filtered review questions:", reviewQuestions.length);

        if (reviewQuestions.length === 0) {
          alert("Could not find the specific questions for review. They might have been removed or changed.");
          // Optionally, navigate back to dashboard or offer alternatives
           const mainOptions = document.getElementById("mainOptions");
           if(mainOptions) mainOptions.style.display = 'flex';
          return;
        }

        const shuffledReviewQuestions = shuffleArray([...reviewQuestions]);
        initializeQuiz(shuffledReviewQuestions);
      },
      error: function(error) {
        console.error("Error parsing CSV:", error);
        alert("Error loading questions. Please check your connection and try again.");
      }
    });
  } catch (e) {
      console.error("Unexpected error in loadSpecificQuestions:", e);
      alert("An unexpected error occurred while loading review questions.");
  }
}

// --- END OF FILE app.js ---
