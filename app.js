// Add splash screen functionality
document.addEventListener('DOMContentLoaded', function() {
  const splashScreen = document.getElementById('splashScreen');
  const welcomeScreen = document.getElementById('welcomeScreen'); // Get welcome screen element

  // Hide splash screen after 2 seconds
  setTimeout(function() {
    if (splashScreen) {
      splashScreen.classList.add('fade-out');

      // Remove splash from DOM *and show Welcome Screen* after fade-out animation completes
      setTimeout(function() {
        splashScreen.style.display = 'none';
        if (welcomeScreen) {
          welcomeScreen.style.display = 'flex'; // Show welcome screen using flex
          // Trigger the fade-in effect
          setTimeout(() => { welcomeScreen.style.opacity = '1'; }, 10); // Small delay ensures transition occurs
        }
      }, 500); // Matches the transition duration in CSS
    } else {
        // If no splash screen, show welcome screen immediately (fallback)
         if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
            welcomeScreen.style.opacity = '1';
         }
    }
  }, 2000); // Splash screen duration

  // Add listeners for Welcome Screen buttons
  const startGuestBtn = document.getElementById('startGuestBtn');
  const loginBtn = document.getElementById('loginBtn');

  if (startGuestBtn) {
    startGuestBtn.addEventListener('click', function() {
      if (welcomeScreen) {
        welcomeScreen.style.display = 'none'; // Hide welcome screen
      }
      // For now, show the main dashboard - this simulates entering as a guest
      const mainOptions = document.getElementById("mainOptions");
      if (mainOptions) {
          mainOptions.style.display = "flex"; // Show the dashboard view
      }
      // Initialize necessary components for guest view if needed later
      // Trigger dashboard event setup explicitly for guest mode start
      if (typeof setupDashboardEvents === 'function') {
          console.log("Guest started, setting up dashboard events.");
          setupDashboardEvents();
      }
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', function() {
      // Placeholder for login functionality
      alert('Login/Signup functionality will be added in the next steps!');
      // In the future, this will likely show a login/signup modal or screen
    });
  }
}); // <<< END OF DOMContentLoaded LISTENER


// Main app initialization
window.addEventListener('load', function() {
  // Ensure functions are globally available
  window.updateUserXP = updateUserXP || function() {
    console.log("updateUserXP not loaded yet");
  };

  window.updateUserMenu = updateUserMenu || function() {
    console.log("updateUserMenu not loaded yet");
  };

  // --- START: Corrected checkAuthAndInit ---
  const checkAuthAndInit = function() {
    const welcomeScreen = document.getElementById('welcomeScreen');

    // 1. Check if welcome screen is blocking execution
    //    (Only run auth checks *after* user interacts with welcome screen OR if it never showed)
    if (welcomeScreen && welcomeScreen.style.display !== 'none' && welcomeScreen.style.opacity === '1') {
        console.log("Welcome screen is visible, delaying auth init check.");
        setTimeout(checkAuthAndInit, 1000); // Check again later
        return; // Don't proceed yet
    }

    // 2. If welcome screen is NOT blocking, check auth status
    //    Need to wait for firebase auth to be ready
    if (window.auth) {
        if (window.auth.currentUser) {
            // User IS logged in
            console.log("User logged in, initializing user state.");
            const mainOptions = document.getElementById("mainOptions");
            if (mainOptions) mainOptions.style.display = "flex"; // Show dashboard
            if (welcomeScreen) welcomeScreen.style.display = 'none'; // Ensure welcome is hidden

            window.updateUserMenu(); // Update user-specific UI

            if (typeof initializeDashboard === 'function') {
                initializeDashboard(); // Load dashboard data for logged-in user
            } else {
                console.warn("initializeDashboard function not found...");
            }
             // Setup dashboard events for logged-in user
             if (typeof setupDashboardEvents === 'function') {
                 console.log("Logged-in user detected, setting up dashboard events.");
                 setupDashboardEvents();
             }

        } else {
            // Auth is ready, but NO user is logged in (GUEST state)
            console.log("Auth ready, user is guest.");
            // The 'Start Learning' button click handler already shows the dashboard for guests.
            // No need to show dashboard here, just let the welcome screen interaction handle it.
        }
    } else {
        // Firebase auth object itself is NOT ready yet. Retry.
        console.log("Firebase auth object not ready, retrying...");
        setTimeout(checkAuthAndInit, 1000);
    }
  };
  // --- END: Corrected checkAuthAndInit ---

  // Start checking for auth state *after* a slight delay
  setTimeout(checkAuthAndInit, 500); // Delay the initial check slightly

  // --- REMOVED REDUNDANT CALL: checkAuthAndInit(); ---

  // --- REMOVED: setupEventsWhenReady - Now handled within checkAuthAndInit or button click ---
  /*
  const setupEventsWhenReady = function() { ... };
  setTimeout(setupEventsWhenReady, 1000);
  */


  // --- Existing event listeners (Score circle, menus, modals etc.) ---
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
      if (typeof showFAQ === 'function') showFAQ(); // Ensure function exists
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
      if (typeof displayPerformance === 'function') displayPerformance(); // Ensure function exists
    });
  }

  // Bookmarks from user menu - start a bookmarks-only quiz
  const bookmarksFilterUser = document.getElementById("bookmarksFilterUser");
  if (bookmarksFilterUser) {
    bookmarksFilterUser.addEventListener("click", function(e) {
      e.preventDefault();
      closeUserMenu();
      if (typeof loadQuestions === 'function') { // Ensure function exists
          loadQuestions({
            bookmarksOnly: true,
            num: 50 // Large number to include all bookmarks
          });
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

      if (!window.auth || !window.auth.currentUser) {
        alert("User not authenticated. Please try again later.");
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
            // Reset XP and Level as well
            data.stats = {
                totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0,
                categories: {}, totalTimeSpent: 0, xp: 0, level: 1,
                achievements: {}, currentCorrectStreak: 0
            };
            data.streaks = { lastAnsweredDate: null, currentStreak: 0, longestStreak: 0 };
            data.spacedRepetition = {}; // Also reset spaced repetition
            transaction.set(userDocRef, data); // Use set to overwrite completely if resetting
          }
        });
        alert("Progress has been reset!");
        // No updateUserCompositeScore function exists, use updateUserXP
        if (typeof updateUserXP === 'function') {
          updateUserXP();
        }
        window.updateUserMenu();
        if (typeof initializeDashboard === 'function') {
            initializeDashboard(); // Refresh dashboard view
        }
      } catch (error) {
        console.error("Error resetting progress:", error);
        alert("There was an error resetting your progress.");
      }
      closeUserMenu();
    });
  }

  // CUSTOM QUIZ BUTTON (modal trigger - outside dashboard)
  const customQuizBtn = document.getElementById("customQuizBtn");
  if (customQuizBtn) {
      // This button is likely NO LONGER needed if using dashboard modal
      console.warn("customQuizBtn found - consider removing if dashboard modal is primary.");
      customQuizBtn.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  // RANDOM QUIZ BUTTON (modal trigger - outside dashboard)
  const randomQuizBtn = document.getElementById("randomQuizBtn");
  if (randomQuizBtn) {
       // This button is likely NO LONGER needed if using dashboard modal
       console.warn("randomQuizBtn found - consider removing if dashboard modal is primary.");
      randomQuizBtn.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  // START QUIZ (Custom - Modal outside dashboard)
  const startCustomQuiz = document.getElementById("startCustomQuiz");
  if (startCustomQuiz) {
    // This button is likely NO LONGER needed if using dashboard modal
    console.warn("startCustomQuiz found - consider removing if dashboard modal is primary.");
    startCustomQuiz.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  // CANCEL QUIZ (Custom - Modal outside dashboard)
  const cancelCustomQuiz = document.getElementById("cancelCustomQuiz");
  if (cancelCustomQuiz) {
    // This button is likely NO LONGER needed if using dashboard modal
    console.warn("cancelCustomQuiz found - consider removing if dashboard modal is primary.");
    cancelCustomQuiz.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  // START QUIZ (Random - Modal outside dashboard)
  const startRandomQuiz = document.getElementById("startRandomQuiz");
  if (startRandomQuiz) {
     // This button is likely NO LONGER needed if using dashboard modal
     console.warn("startRandomQuiz found - consider removing if dashboard modal is primary.");
    startRandomQuiz.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  // CANCEL QUIZ (Random - Modal outside dashboard)
  const cancelRandomQuiz = document.getElementById("cancelRandomQuiz");
  if (cancelRandomQuiz) {
    // This button is likely NO LONGER needed if using dashboard modal
    console.warn("cancelRandomQuiz found - consider removing if dashboard modal is primary.");
    cancelRandomQuiz.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  // Bookmarks from side menu (should likely trigger gated feature prompt later)
  const bookmarksFilter = document.getElementById("bookmarksFilter");
  if (bookmarksFilter) {
    bookmarksFilter.addEventListener("click", function(e) {
      e.preventDefault();
      // TODO: Add guest check here later
      alert("Bookmarks require an account (Feature coming soon!)");
      closeSideMenu();
    });
  }

  // START NEW QUIZ from side menu
  const startNewQuiz = document.getElementById("startNewQuiz");
  if (startNewQuiz) {
    startNewQuiz.addEventListener("click", function() {
      closeSideMenu();
      // Go back to the main dashboard view
      const viewsToHide = [".swiper", "#bottomToolbar", "#iconBar", "#performanceView", "#leaderboardView", "#faqView", "#aboutView"];
      viewsToHide.forEach(selector => {
          const element = document.querySelector(selector);
          if (element) element.style.display = "none";
      });
      const mainOptions = document.getElementById("mainOptions");
      if (mainOptions) mainOptions.style.display = "flex";
    });
  }

  // LEADERBOARD from side menu
  const leaderboardItem = document.getElementById("leaderboardItem");
  if (leaderboardItem) {
    leaderboardItem.addEventListener("click", function() {
      closeSideMenu();
      // TODO: Add guest check here later
      if (typeof showLeaderboard === 'function') {
        showLeaderboard();
      } else {
        alert("Leaderboard requires an account (Feature coming soon!)");
      }
    });
  }

  // FAQ from side menu
  const faqItem = document.getElementById("faqItem");
  if (faqItem) {
    faqItem.addEventListener("click", function() {
      closeSideMenu();
      if (typeof showFAQ === 'function') showFAQ();
    });
  }

  // ABOUT US from side menu
  const aboutItem = document.getElementById("aboutItem");
  if (aboutItem) {
    aboutItem.addEventListener("click", function() {
      closeSideMenu();
       if (typeof showAbout === 'function') showAbout();
    });
  }

  // CONTACT US from side menu
  const contactItem = document.getElementById("contactItem");
  if (contactItem) {
    contactItem.addEventListener("click", function() {
      closeSideMenu();
      // Hide other views
      const viewsToHide = [".swiper", "#bottomToolbar", "#iconBar", "#performanceView", "#leaderboardView", "#faqView", "#aboutView", "#mainOptions"];
       viewsToHide.forEach(selector => {
          const element = document.querySelector(selector);
          if (element) element.style.display = "none";
      });
      if (typeof showContactModal === 'function') showContactModal(); // Show contact modal
    });
  }

  // Side menu toggling
  const menuToggle = document.getElementById("menuToggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  const menuClose = document.getElementById("menuClose");
  if (menuClose) {
    menuClose.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  const menuOverlay = document.getElementById("menuOverlay");
  if (menuOverlay) {
    menuOverlay.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  // Logo click => go to main menu/dashboard
  const logoClick = document.getElementById("logoClick");
  if (logoClick) {
    logoClick.addEventListener("click", function() {
       closeSideMenu();
       closeUserMenu();
       // Hide other views and show dashboard
       const viewsToHide = [".swiper", "#bottomToolbar", "#iconBar", "#performanceView", "#leaderboardView", "#faqView", "#aboutView"];
       viewsToHide.forEach(selector => {
          const element = document.querySelector(selector);
          if (element) element.style.display = "none";
       });
       const mainOptions = document.getElementById("mainOptions");
       if (mainOptions) mainOptions.style.display = "flex";
    });
  }

  // FEEDBACK button (during quiz)
  const feedbackButton = document.getElementById("feedbackButton");
  if (feedbackButton) {
    feedbackButton.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  // FEEDBACK modal close
  const closeFeedbackModal = document.getElementById("closeFeedbackModal");
  if (closeFeedbackModal) {
    closeFeedbackModal.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  // FEEDBACK submit
  const submitFeedback = document.getElementById("submitFeedback");
  if (submitFeedback) {
    submitFeedback.addEventListener("click", async function() { /* ... existing logic ... */ });
  }

  // FAVORITE button (bookmark - during quiz)
  const favoriteButton = document.getElementById("favoriteButton");
  if (favoriteButton) {
    favoriteButton.addEventListener("click", async function() {
        // TODO: Add guest check here later
        if (!window.auth || !window.auth.currentUser) {
            alert("Bookmarking requires an account. Please sign up to save your favorite questions!");
            return;
        }
        // --- Existing bookmark logic ---
        let questionId = getCurrentQuestionId();
        if (!questionId) return;
        const wasToggled = await toggleBookmark(questionId.trim());
        if (wasToggled) {
          favoriteButton.innerText = "★";
          favoriteButton.style.color = "#007BFF"; // Blue
        } else {
          favoriteButton.innerText = "☆";
          favoriteButton.style.color = "";
        }
        // --- End existing bookmark logic ---
    });
  }

  // CONTACT modal buttons (Submit)
  const submitContact = document.getElementById("submitContact");
  if (submitContact) {
    submitContact.addEventListener("click", async function() { /* ... existing logic ... */ });
  }

  // CONTACT modal buttons (Close)
  const closeContactModal = document.getElementById("closeContactModal");
  if (closeContactModal) {
    closeContactModal.addEventListener("click", function() { /* ... existing logic ... */ });
  }

  // Clean up any existing LEVEL UP text on page load
  const textNodes = document.querySelectorAll('body > *:not([id])');
  textNodes.forEach(node => { /* ... existing logic ... */ });

}); // <<< END OF window.load LISTENER


// --- Global Function Definitions ---

// Function to update the level progress circles and bar
function updateLevelProgress(percent) { /* ... existing definition ... */ }

// --- Removed standalone 'load' listener for updateUserXP ---

// Function to check if a user's streak should be reset due to inactivity
async function checkAndUpdateStreak() { /* ... existing definition ... */ }

// Function to load leaderboard preview data - fixed for desktop view
async function loadLeaderboardPreview() { /* ... existing definition ... */ }

// Dashboard initialization and functionality
async function initializeDashboard() { /* ... existing definition ... */ }

// Function to count questions due for review today
async function countDueReviews() { /* ... existing definition ... */ }

// Function to update the Review Queue card in the dashboard
async function updateReviewQueue() { /* ... existing definition ... */ }

// Set up event listeners for dashboard (Moved definition here for clarity)
function setupDashboardEvents() {
  console.log("Setting up event listeners for dashboard elements..."); // Debugging log

  // Start Quiz button (from Dashboard)
  const startQuizBtn = document.getElementById("startQuizBtn");
  if (startQuizBtn) {
    // Remove previous listeners if any (safer approach)
    startQuizBtn.replaceWith(startQuizBtn.cloneNode(true));
    const newStartQuizBtn = document.getElementById("startQuizBtn");
    newStartQuizBtn.addEventListener("click", function() {
      console.log("Dashboard Start Quiz button clicked");
      const quizSetupModal = document.getElementById("quizSetupModal");
      if (quizSetupModal) {
        quizSetupModal.style.display = "block";
      } else {
        console.error("quizSetupModal not found");
      }
    });
  } else {
    console.warn("startQuizBtn not found");
  }

  // Modal Start Quiz button (from Dashboard Modal)
  const modalStartQuiz = document.getElementById("modalStartQuiz");
  if (modalStartQuiz) {
     // Remove previous listeners if any
     modalStartQuiz.replaceWith(modalStartQuiz.cloneNode(true));
     const newModalStartQuiz = document.getElementById("modalStartQuiz");
     newModalStartQuiz.addEventListener("click", function() {
       console.log("Modal Start Quiz button clicked");
       const category = document.getElementById("modalCategorySelect").value;
       const numQuestions = parseInt(document.getElementById("modalNumQuestions").value) || 10;
       const includeAnswered = document.getElementById("modalIncludeAnswered").checked;
       const useSpacedRepetition = document.getElementById("modalSpacedRepetition").checked;

       const quizSetupModal = document.getElementById("quizSetupModal");
       if(quizSetupModal) quizSetupModal.style.display = "none";

       if (typeof loadQuestions === 'function') { // Ensure function exists
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
  } else {
    console.warn("modalStartQuiz not found");
  }

  // Modal Cancel button (from Dashboard Modal)
  const modalCancelQuiz = document.getElementById("modalCancelQuiz");
  if (modalCancelQuiz) {
     // Remove previous listeners if any
     modalCancelQuiz.replaceWith(modalCancelQuiz.cloneNode(true));
     const newModalCancelQuiz = document.getElementById("modalCancelQuiz");
     newModalCancelQuiz.addEventListener("click", function() {
      console.log("Modal Cancel Quiz button clicked");
      const quizSetupModal = document.getElementById("quizSetupModal");
      if (quizSetupModal) {
        quizSetupModal.style.display = "none";
      } else {
        console.error("quizSetupModal not found");
      }
    });
  } else {
    console.warn("modalCancelQuiz not found");
  }

  // User Progress card click - go to Performance
  const userProgressCard = document.getElementById("userProgressCard");
  if (userProgressCard) {
     // Remove previous listeners if any
     userProgressCard.replaceWith(userProgressCard.cloneNode(true));
     const newUserProgressCard = document.getElementById("userProgressCard");
     newUserProgressCard.addEventListener("click", function() {
      console.log("User Progress Card clicked");
      // TODO: Add guest check here later
      if (typeof displayPerformance === 'function') {
          displayPerformance();
      } else {
          console.error("displayPerformance function not found");
          alert("Performance requires an account (Feature coming soon!)");
      }
    });
  } else {
    console.warn("userProgressCard not found");
  }

  // Quick Stats card click - go to Performance
  const quickStatsCard = document.getElementById("quickStatsCard");
  if (quickStatsCard) {
    // Remove previous listeners if any
    quickStatsCard.replaceWith(quickStatsCard.cloneNode(true));
    const newQuickStatsCard = document.getElementById("quickStatsCard");
    newQuickStatsCard.addEventListener("click", function() {
      console.log("Quick Stats Card clicked");
       // TODO: Add guest check here later
       if (typeof displayPerformance === 'function') {
          displayPerformance();
      } else {
          console.error("displayPerformance function not found");
          alert("Stats require an account (Feature coming soon!)");
      }
    });
  } else {
    console.warn("quickStatsCard not found");
  }

  // Leaderboard Preview card click - go to Leaderboard
  const leaderboardPreviewCard = document.getElementById("leaderboardPreviewCard");
  if (leaderboardPreviewCard) {
     // Remove previous listeners if any
     leaderboardPreviewCard.replaceWith(leaderboardPreviewCard.cloneNode(true));
     const newLeaderboardPreviewCard = document.getElementById("leaderboardPreviewCard");
     newLeaderboardPreviewCard.addEventListener("click", function() {
      console.log("Leaderboard Preview Card clicked");
      // TODO: Add guest check here later
      if (typeof showLeaderboard === 'function') {
        showLeaderboard();
      } else {
        console.error("showLeaderboard function not found");
        alert("Leaderboard requires an account (Feature coming soon!)");
      }
    });
  } else {
    console.warn("leaderboardPreviewCard not found");
  }

  // Review Queue card click - start review
  const reviewQueueCard = document.getElementById("reviewQueueCard");
  if (reviewQueueCard) {
     // Remove previous listeners if any
     reviewQueueCard.replaceWith(reviewQueueCard.cloneNode(true));
     const newReviewQueueCard = document.getElementById("reviewQueueCard");
     newReviewQueueCard.addEventListener("click", async function() {
      console.log("Review Queue Card clicked");
      // TODO: Add guest check here later
      if (!window.auth || !window.auth.currentUser) {
          alert("Review Queue requires an account. Please sign up to use spaced repetition!");
          return;
      }
       // --- Existing logic ---
       const { dueCount } = await countDueReviews();
       if (dueCount === 0) { /* ... alert ... */ return; }
       const dueQuestionIds = await getDueQuestionIds();
       if (dueQuestionIds.length === 0) { /* ... alert ... */ return; }
       loadSpecificQuestions(dueQuestionIds);
       // --- End existing logic ---
    });
  } else {
    console.warn("reviewQueueCard not found");
  }
} // <<< END of setupDashboardEvents definition

// Function to fix streak calendar alignment
function fixStreakCalendar(streaks) { /* ... existing definition ... */ }

// --- REMOVED: Redundant initialization calls from bottom ---
/*
window.addEventListener('load', function() {
  const checkAuthAndInitAll = function() { ... };
  checkAuthAndInitAll();
  setTimeout(function() {
    setupDashboardEvents(); // Old call location
    initializeDashboard(); // Old call location
  }, 2000);
});
*/

// Function to get IDs of questions due for review
async function getDueQuestionIds() { /* ... existing definition ... */ }

// Function to load only specific questions by ID
async function loadSpecificQuestions(questionIds) { /* ... existing definition ... */ }

// --- Need utility functions like closeSideMenu, closeUserMenu ---
function closeSideMenu() {
  const sideMenu = document.getElementById("sideMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  if (sideMenu) sideMenu.classList.remove("open");
  if (menuOverlay) menuOverlay.classList.remove("show");
}

function closeUserMenu() {
  const userMenu = document.getElementById("userMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  if (userMenu) userMenu.classList.remove("open");
  if (menuOverlay) menuOverlay.classList.remove("show");
}

// Add other utility functions if they were defined in app.js previously
// e.g., showFAQ, showAbout, showContactModal, displayPerformance, showLeaderboard
// Need definitions or ensure they are correctly imported/available from ui.js/stats.js

// Make sure functions from other files are available globally or imported
// Assuming ui.js and stats.js correctly expose these functions to window:
// e.g., in ui.js: window.showFAQ = showFAQ;
// e.g., in stats.js: window.displayPerformance = displayPerformance;

// --- END OF CORRECTED FILE app.js ---
```
