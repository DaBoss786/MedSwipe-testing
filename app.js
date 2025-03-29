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
            if (splashScreen) splashScreen.style.display = 'none'; // Ensure splash is hidden

            if (event.detail.isRegistered) {
              // Registered user - go straight to dashboard
              console.log('User is registered, showing dashboard');
              if (mainOptions) {
                mainOptions.style.display = 'flex';

                // ***** CORRECTED PART: Initialize and set up dashboard HERE *****
                // Check function existence before calling
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

              } else {
                 console.error("Main options element (#mainOptions) not found!");
              }
            } else {
              // Guest user - show welcome screen
              console.log('User is guest, showing welcome screen');
              if (welcomeScreen) {
                welcomeScreen.style.opacity = '1';
              } else {
                 console.error("Welcome screen element (#welcomeScreen) not found!");
              }
            }
          }, 500); // Matches the transition duration in CSS
        } else {
            console.error("Splash screen element (#splashScreen) not found!");
        }
      }, 2000); // Splash screen duration
    }
  });

  // Handle welcome screen buttons
  const startLearningBtn = document.getElementById('startLearningBtn');
  const existingAccountBtn = document.getElementById('existingAccountBtn');

  if (startLearningBtn) {
    startLearningBtn.addEventListener('click', function() {
      if (welcomeScreen) {
        welcomeScreen.style.opacity = '0';
        setTimeout(function() {
          welcomeScreen.style.display = 'none';
          if (mainOptions) {
            mainOptions.style.display = 'flex';
            // Initialize and setup dashboard when coming from welcome screen too
            if (typeof initializeDashboard === 'function') {
              initializeDashboard();
            } else {
               console.error("initializeDashboard function not found!");
            }
            if (typeof setupDashboardEvents === 'function') {
              setupDashboardEvents();
            } else {
               console.error("setupDashboardEvents function not found!");
            }
          } else {
            console.error("Main options element (#mainOptions) not found!");
          }
        }, 500); // Matches transition duration
      }
    });
  }

  if (existingAccountBtn) {
    existingAccountBtn.addEventListener('click', function() {
       if (welcomeScreen) {
         welcomeScreen.style.opacity = '0';
         setTimeout(function() {
           welcomeScreen.style.display = 'none';
           // Show the new login screen (preferred) or fallback modal
           if (typeof window.showLoginScreen === 'function') {
             window.showLoginScreen();
           } else if (typeof showLoginForm === 'function') {
             showLoginForm(); // Fallback
           } else {
              console.error("No login screen function available (showLoginScreen or showLoginForm)");
           }
         }, 500); // Matches transition duration
       }
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

    // --- Event Listeners for Fallback Login Modal ---
    const loginForm = document.getElementById('loginForm');
    const createAccountBtn = document.getElementById('createAccountBtnLoginModal');
    const closeLoginBtn = document.getElementById('closeLoginBtn');

    if (loginForm) {
      loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const errorElement = document.getElementById('loginError');
        if (!emailInput || !passwordInput || !errorElement || !window.authFunctions) return; // Guard clauses

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
          errorElement.textContent = '';
          await window.authFunctions.loginUser(email, password);
          // Success
          loginModal.style.display = 'none';
          const mainOptions = document.getElementById('mainOptions');
          if (mainOptions) mainOptions.style.display = 'flex';
          // Initialize and setup dashboard after successful login
          if (typeof initializeDashboard === 'function') initializeDashboard();
          if (typeof setupDashboardEvents === 'function') setupDashboardEvents();
        } catch (error) {
          errorElement.textContent = getAuthErrorMessage(error);
        }
      });
    }

    if (createAccountBtn) {
      createAccountBtn.addEventListener('click', function() {
        loginModal.style.display = 'none';
        if (typeof showRegisterForm === 'function') showRegisterForm(); // Call fallback register
        else console.error("showRegisterForm function not found");
      });
    }

    if (closeLoginBtn) {
      closeLoginBtn.addEventListener('click', function() {
        loginModal.style.display = 'none';
        // Ensure dashboard is shown if user closes login without logging in
        const mainOptions = document.getElementById('mainOptions');
        if (mainOptions && mainOptions.style.display === 'none') {
           mainOptions.style.display = 'flex';
           if (typeof initializeDashboard === 'function') initializeDashboard();
           if (typeof setupDashboardEvents === 'function') setupDashboardEvents();
        }
      });
    }
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

    // --- Event Listeners for Fallback Register Modal ---
    const registerForm = document.getElementById('registerForm');
    const goToLoginBtn = document.getElementById('goToLoginBtn');
    const closeRegisterBtn = document.getElementById('closeRegisterBtn');

    if(registerForm) {
      registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const usernameInput = document.getElementById('registerUsername');
        const emailInput = document.getElementById('registerEmail');
        const passwordInput = document.getElementById('registerPassword');
        const experienceInput = document.getElementById('registerExperience');
        const errorElement = document.getElementById('registerError');
        if (!usernameInput || !emailInput || !passwordInput || !experienceInput || !errorElement || !window.authFunctions || !window.authState) return; // Guard clauses

        const username = usernameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const experience = experienceInput.value;

        try {
          errorElement.textContent = '';

          if (window.authState.user && window.authState.user.isAnonymous) {
            await window.authFunctions.upgradeAnonymousUser(email, password, username, experience);
          } else {
            await window.authFunctions.registerUser(email, password, username, experience);
          }

          // Success
          registerModal.style.display = 'none';
          const mainOptions = document.getElementById('mainOptions');
          if (mainOptions) mainOptions.style.display = 'flex';
          // Initialize and setup dashboard after successful registration/upgrade
          if (typeof initializeDashboard === 'function') initializeDashboard();
          if (typeof setupDashboardEvents === 'function') setupDashboardEvents();
        } catch (error) {
          errorElement.textContent = getAuthErrorMessage(error);
        }
      });
    }

    if (goToLoginBtn) {
      goToLoginBtn.addEventListener('click', function() {
        registerModal.style.display = 'none';
        // Prefer new login screen, fallback to modal
        if (typeof window.showLoginScreen === 'function') window.showLoginScreen();
        else if (typeof showLoginForm === 'function') showLoginForm();
        else console.error("No login screen function available");
      });
    }

    if (closeRegisterBtn) {
      closeRegisterBtn.addEventListener('click', function() {
        registerModal.style.display = 'none';
        // Ensure dashboard is shown if user closes register without registering
         const mainOptions = document.getElementById('mainOptions');
         if (mainOptions && mainOptions.style.display === 'none') {
            mainOptions.style.display = 'flex';
            if (typeof initializeDashboard === 'function') initializeDashboard();
            if (typeof setupDashboardEvents === 'function') setupDashboardEvents();
         }
      });
    }
  }

  // Show the modal
  registerModal.style.display = 'flex';
}

// Helper function to get user-friendly error messages
function getAuthErrorMessage(error) {
  // Check if error or error.code is undefined
  const errorCode = error?.code;

  switch (errorCode) {
    case 'auth/invalid-email': return 'Invalid email address format';
    case 'auth/user-disabled': return 'This account has been disabled';
    case 'auth/user-not-found': return 'No account found with this email';
    case 'auth/wrong-password': return 'Incorrect password';
    case 'auth/email-already-in-use': return 'An account with this email already exists';
    case 'auth/weak-password': return 'Password is too weak (min. 6 characters)'; // Added minimum length hint
    case 'auth/network-request-failed': return 'Network error - please check your connection';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/operation-not-allowed': return 'Email/password accounts are not enabled.'; // Useful for debugging Firebase settings
    case 'auth/requires-recent-login': return 'Please log in again to perform this action.';
    // Add more specific Firebase Auth error codes as needed
    default:
      // Log the original error for debugging but show generic message to user
      console.error("Unhandled Auth Error:", error);
      return error?.message || 'An unknown authentication error occurred. Please try again.';
  }
}

// --- General UI event listeners - Attached ONCE on Load ---
window.addEventListener('load', function() {
  console.log("Attaching general UI event listeners on page load.");

  // Helper to safely attach listener if element exists
  const safelyAttachListener = (id, event, handler, checkFlag = false) => {
     const element = document.getElementById(id);
     if (element) {
        // Optional flag check to prevent duplicates if needed elsewhere
        if (!checkFlag || !element._generalListenerAttached) {
          element.addEventListener(event, handler);
          if (checkFlag) element._generalListenerAttached = true;
        }
     } else {
        // console.warn(`Element #${id} not found for general listener.`); // Can be noisy
     }
  };

  // Top Bar Interactions
  safelyAttachListener("scoreCircle", "click", function() { // User Level Circle
      const userMenu = document.getElementById("userMenu");
      const menuOverlay = document.getElementById("menuOverlay");
      if (userMenu) userMenu.classList.add("open");
      if (menuOverlay) menuOverlay.classList.add("show");
  });
  safelyAttachListener("menuToggle", "click", function() { // Main Menu Burger
      const sideMenu = document.getElementById("sideMenu");
      const menuOverlay = document.getElementById("menuOverlay");
      if (sideMenu) sideMenu.classList.add("open");
      if (menuOverlay) menuOverlay.classList.add("show");
  });
   safelyAttachListener("logoClick", "click", function() { // Logo Click -> Dashboard
      if (typeof closeSideMenu === 'function') closeSideMenu();
      if (typeof closeUserMenu === 'function') closeUserMenu();
      // Hide all other views
      ['aboutView', 'faqView', 'performanceView', 'leaderboardView', 'contactModal', 'quizSetupModal', 'randomQuizForm', 'customQuizForm'].forEach(id => {
         const el = document.getElementById(id);
         if (el) el.style.display = 'none';
      });
      const swiper = document.querySelector(".swiper"); if (swiper) swiper.style.display = 'none';
      const bottomToolbar = document.getElementById("bottomToolbar"); if (bottomToolbar) bottomToolbar.style.display = 'none';
      const iconBar = document.getElementById("iconBar"); if (iconBar) iconBar.style.display = 'none';

      // Show dashboard and initialize
      const mainOptions = document.getElementById("mainOptions");
      if (mainOptions) mainOptions.style.display = "flex";
      if (typeof initializeDashboard === 'function') initializeDashboard();
      if (typeof setupDashboardEvents === 'function') setupDashboardEvents();
  });

  // Overlay Click (closes both menus)
   safelyAttachListener("menuOverlay", "click", function() {
      if (typeof closeSideMenu === 'function') closeSideMenu();
      if (typeof closeUserMenu === 'function') closeUserMenu();
  });

  // --- Side Menu (Left) ---
  safelyAttachListener("menuClose", "click", closeSideMenu);
  safelyAttachListener("startNewQuiz", "click", function() { // -> Dashboard
      if (typeof closeSideMenu === 'function') closeSideMenu();
      window.filterMode = "all"; // Reset filter mode if applicable
      // Use logoClick's logic to navigate to dashboard
      const logo = document.getElementById("logoClick");
      if (logo) logo.click(); // Simulate logo click
  });
   safelyAttachListener("customQuizBtn", "click", function() { // Show Custom Quiz Modal
      if (typeof closeSideMenu === 'function') closeSideMenu();
      const customQuizForm = document.getElementById("customQuizForm");
      if (customQuizForm) customQuizForm.style.display = "block";
      // Optionally hide other views
      const randomQuizForm = document.getElementById("randomQuizForm"); if(randomQuizForm) randomQuizForm.style.display="none";
  });
  safelyAttachListener("randomQuizBtn", "click", function() { // Show Random Quiz Modal
      if (typeof closeSideMenu === 'function') closeSideMenu();
      const randomQuizForm = document.getElementById("randomQuizForm");
      if (randomQuizForm) randomQuizForm.style.display = "block";
       // Optionally hide other views
      const customQuizForm = document.getElementById("customQuizForm"); if(customQuizForm) customQuizForm.style.display="none";
  });
   safelyAttachListener("bookmarksFilter", "click", function(e) { // Show Bookmarks Quiz (now in User Menu)
      e.preventDefault();
      if (typeof closeSideMenu === 'function') closeSideMenu();
      // Logic moved to User Menu's bookmarksFilterUser listener
      console.log("Bookmarks filter in side menu clicked - action moved to user menu.");
  });
   safelyAttachListener("leaderboardItem", "click", function() { // Show Leaderboard View
      if (typeof closeSideMenu === 'function') closeSideMenu();
      if (typeof showLeaderboard === 'function') showLeaderboard();
      else console.error("showLeaderboard function not found");
  });
   safelyAttachListener("faqItem", "click", function() { // Show FAQ View
      if (typeof closeSideMenu === 'function') closeSideMenu();
      if (typeof showFAQ === 'function') showFAQ();
      else console.error("showFAQ function not found");
  });
   safelyAttachListener("aboutItem", "click", function() { // Show About View
      if (typeof closeSideMenu === 'function') closeSideMenu();
      if (typeof showAbout === 'function') showAbout();
      else console.error("showAbout function not found");
  });
   safelyAttachListener("contactItem", "click", function() { // Show Contact Modal
      if (typeof closeSideMenu === 'function') closeSideMenu();
       // Hide other views first
      ['mainOptions', 'aboutView', 'faqView', 'performanceView', 'leaderboardView'].forEach(id => {
         const el = document.getElementById(id); if(el) el.style.display = 'none';
      });
       const swiper = document.querySelector(".swiper"); if(swiper) swiper.style.display = 'none';
       const bottomToolbar = document.getElementById("bottomToolbar"); if(bottomToolbar) bottomToolbar.style.display = 'none';
       const iconBar = document.getElementById("iconBar"); if(iconBar) iconBar.style.display = 'none';
       // Show contact modal
      if (typeof showContactModal === 'function') showContactModal();
      else console.error("showContactModal function not found");
  });


  // --- User Menu (Right) ---
  safelyAttachListener("userMenuClose", "click", closeUserMenu);
  safelyAttachListener("userScoreCircle", "click", function() { // -> Go to FAQ
      if (typeof closeUserMenu === 'function') closeUserMenu();
      if (typeof showFAQ === 'function') showFAQ();
      else console.error("showFAQ function not found");
  });
   safelyAttachListener("performanceItemUser", "click", function() { // Show Performance View
      if (typeof closeUserMenu === 'function') closeUserMenu();
      if (typeof displayPerformance === 'function') displayPerformance();
      else console.error("displayPerformance function not found");
  });
   safelyAttachListener("bookmarksFilterUser", "click", function(e) { // Start Bookmarks Quiz
      e.preventDefault();
      if (typeof closeUserMenu === 'function') closeUserMenu();
      if (typeof loadQuestions === 'function') {
        loadQuestions({ bookmarksOnly: true, num: 50 }); // Load all bookmarks
      } else {
         console.error("loadQuestions function not found");
      }
  });
   safelyAttachListener("resetProgressUser", "click", async function(e) { // Reset User Progress
      e.preventDefault();
      if (!confirm("Are you sure you want to reset ALL progress? This includes XP, level, streaks, answered questions, and review schedules. This cannot be undone.")) return;

      if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction) {
        alert("System not ready. Please try again later."); return;
      }
      const uid = window.auth.currentUser.uid;
      const userDocRef = window.doc(window.db, 'users', uid);
      try {
        await window.runTransaction(window.db, async (transaction) => {
          transaction.set(userDocRef, { // Overwrite with default structure
             username: (await getOrGenerateUsername()), // Keep/regenerate username
             isRegistered: window.authState.isRegistered, // Keep registration status
             createdAt: window.authState.user?.metadata?.creationTime || serverTimestamp(), // Keep original creation if poss.
             updatedAt: serverTimestamp(),
             // --- RESET THESE ---
             answeredQuestions: {},
             stats: { totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0, categories: {}, totalTimeSpent: 0, xp: 0, level: 1, achievements: {}, currentCorrectStreak: 0 },
             streaks: { lastAnsweredDate: null, currentStreak: 0, longestStreak: 0 },
             spacedRepetition: {},
             bookmarks: [] // Also reset bookmarks? Or keep them? Decide and adjust. Assuming reset here.
           }, { merge: false }); // Use set without merge to ensure full reset
        });
        alert("Progress has been reset!");
        // Refresh UI
        if (typeof window.updateUserXP === 'function') window.updateUserXP();
        if (typeof window.updateUserMenu === 'function') window.updateUserMenu();
        if (typeof initializeDashboard === 'function') initializeDashboard();
      } catch (error) {
        console.error("Error resetting progress:", error);
        alert("There was an error resetting your progress.");
      }
      if (typeof closeUserMenu === 'function') closeUserMenu();
  });
   // Add Logout Listener dynamically in user-profile.js or auth.js when user state is known


  // --- Quiz Setup Modals (Random & Custom) ---
  // Moved START logic to setupDashboardEvents as modals are related to dashboard start button
  // CANCEL buttons:
  safelyAttachListener("cancelCustomQuiz", "click", function() {
      const customQuizForm = document.getElementById("customQuizForm");
      if (customQuizForm) customQuizForm.style.display = "none";
  });
  safelyAttachListener("cancelRandomQuiz", "click", function() {
      const randomQuizForm = document.getElementById("randomQuizForm");
      if (randomQuizForm) randomQuizForm.style.display = "none";
  });

  // --- In-Quiz Buttons (Icon Bar) ---
  safelyAttachListener("feedbackButton", "click", function() { // Show Feedback Modal
      const questionId = typeof getCurrentQuestionId === 'function' ? getCurrentQuestionId() : null;
      let questionText = "";
      if (questionId){
        const questionSlide = document.querySelector(`.swiper-slide[data-id="${questionId}"]`);
        if (questionSlide) {
          const questionElem = questionSlide.querySelector(".question");
          if (questionElem) questionText = questionElem.textContent.trim();
        }
      }
      window.currentFeedbackQuestionId = questionId || ""; // Use window scope if needed globally
      window.currentFeedbackQuestionText = questionText || "";

      const feedbackQuestionInfo = document.getElementById("feedbackQuestionInfo");
      if (feedbackQuestionInfo) feedbackQuestionInfo.textContent = `Feedback for Q: ${window.currentFeedbackQuestionText}`;
      const feedbackModal = document.getElementById("feedbackModal");
      if (feedbackModal) feedbackModal.style.display = "flex";
  });
  safelyAttachListener("favoriteButton", "click", async function() { // Toggle Bookmark
      const questionId = typeof getCurrentQuestionId === 'function' ? getCurrentQuestionId() : null;
      if (!questionId) return;
      if (typeof toggleBookmark !== 'function') { console.error("toggleBookmark function not found"); return; }

      const isNowBookmarked = await toggleBookmark(questionId.trim());
      const favButton = document.getElementById("favoriteButton"); // Re-get element just in case
      if(favButton){
          favButton.innerText = isNowBookmarked ? "★" : "☆";
          favButton.style.color = isNowBookmarked ? "#007BFF" : "";
      }
  });

  // --- Feedback Modal ---
  safelyAttachListener("closeFeedbackModal", "click", function() {
      const feedbackModal = document.getElementById("feedbackModal");
      if (feedbackModal) feedbackModal.style.display = "none";
  });
   safelyAttachListener("submitFeedback", "click", async function() { // Submit Feedback
      const feedbackTextElement = document.getElementById("feedbackText");
      const feedbackText = feedbackTextElement ? feedbackTextElement.value.trim() : "";
      if (!feedbackText) { alert("Please enter your feedback."); return; }
      if (!window.db || !window.addDoc || !window.collection || !window.serverTimestamp) { alert("System not ready."); return; }

      try {
        await window.addDoc(window.collection(window.db, "feedback"), {
          questionId: window.currentFeedbackQuestionId || "",
          questionText: window.currentFeedbackQuestionText || "",
          feedback: feedbackText,
          timestamp: window.serverTimestamp(),
          userId: window.auth?.currentUser?.uid || "unknown" // Add user ID if possible
        });
        alert("Thank you for your feedback!");
        if (feedbackTextElement) feedbackTextElement.value = "";
        const feedbackModal = document.getElementById("feedbackModal");
        if (feedbackModal) feedbackModal.style.display = "none";
      } catch (error) {
        console.error("Error submitting feedback:", error);
        alert("There was an error submitting your feedback.");
      }
  });

  // --- Contact Modal ---
  safelyAttachListener("closeContactModal", "click", function() {
      const contactModal = document.getElementById("contactModal");
      if (contactModal) contactModal.style.display = "none";
  });
   safelyAttachListener("submitContact", "click", async function() { // Submit Contact Form
      const contactEmailElement = document.getElementById("contactEmail");
      const contactMessageElement = document.getElementById("contactMessage");
      const email = contactEmailElement ? contactEmailElement.value.trim() : "";
      const message = contactMessageElement ? contactMessageElement.value.trim() : "";
      if (!message) { alert("Please enter your message."); return; }
      if (!window.auth || !window.auth.currentUser || !window.db || !window.addDoc || !window.collection || !window.serverTimestamp) { alert("System not ready."); return; }

      try {
        await window.addDoc(window.collection(window.db, "contact"), {
          email: email, // Include email even if empty
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
        alert("There was an error submitting your message.");
      }
  });

  // Clean up stray "LEVEL UP" text on load (just in case)
  const textNodes = document.querySelectorAll('body > *:not(script):not(style):not(link):not(meta)'); // More specific selector
  textNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.includes('LEVEL UP')) {
      console.warn("Removing stray 'LEVEL UP' text node on load.");
      node.remove();
    } else if (node.nodeType === Node.ELEMENT_NODE && node.id === '' && node.textContent && node.textContent.includes('LEVEL UP')) {
       console.warn("Removing stray element potentially related to 'LEVEL UP' on load.");
       node.remove();
    }
  });

  // Initial UI Update attempt after slight delay for auth state
   setTimeout(() => {
       if (typeof window.updateUserXP === 'function') window.updateUserXP();
       if (typeof window.updateUserMenu === 'function') window.updateUserMenu();
       // Check streak on load after auth is likely settled
       if (typeof checkAndUpdateStreak === 'function') checkAndUpdateStreak();
   }, 1000); // Delay to allow auth state listener to potentially run first

});

// Function to update the level progress circles and bar
function updateLevelProgress(percent) {
  const progressValue = `${percent}%`;
  // Helper to set style property if element exists
  const setProgress = (id, value) => {
     const element = document.getElementById(id);
     if (element) element.style.setProperty('--progress', value);
  };
  const setWidth = (id, value) => {
     const element = document.getElementById(id);
     if (element) element.style.width = value;
  }

  setProgress("levelCircleProgress", progressValue);    // Top bar circle fill
  setProgress("userLevelProgress", progressValue);      // User menu circle fill
  setProgress("dashboardLevelProgress", progressValue); // Dashboard card circle fill
  setWidth("levelProgressBar", progressValue);        // User menu horizontal bar
  setWidth("dashboardReviewProgressBar", progressValue); // Review Queue progress bar (assuming ID) - NOTE: This ID might need verification
}

// --- Global Helper Functions (Ensure these are defined or imported if needed elsewhere) ---
// Example: Assuming these are defined in utils.js or elsewhere and available globally
// function closeSideMenu() { ... }
// function closeUserMenu() { ... }
// function getCurrentQuestionId() { ... }
// function showLeaderboard() { ... }
// function showFAQ() { ... }
// function showAbout() { ... }
// function showContactModal() { ... }
// function displayPerformance() { ... }
// function loadQuestions() { ... }
// function toggleBookmark() { ... }

// --- END OF FILE app.js ---
