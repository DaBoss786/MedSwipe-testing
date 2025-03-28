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
});

// Main app initialization
window.addEventListener('load', function() {
  // Ensure functions are globally available
  window.updateUserXP = updateUserXP || function() {
    console.log("updateUserXP not loaded yet");
  };
  
  window.updateUserMenu = updateUserMenu || function() {
    console.log("updateUserMenu not loaded yet");
  };
  
  // Initialize user menu with username
  // --- START: Corrected checkAuthAndInit ---
  const checkAuthAndInit = function() {
    const welcomeScreen = document.getElementById('welcomeScreen');

    // 1. Check if welcome screen is blocking execution
    if (welcomeScreen && welcomeScreen.style.display !== 'none' && welcomeScreen.style.opacity === '1') {
        console.log("Welcome screen is visible, delaying auth init check.");
        setTimeout(checkAuthAndInit, 1000); // Check again later
        return; // Don't proceed yet
    } // <<< Correct closing brace for welcome screen check

    // --------------------------------------------------------------
    // The rest of the logic runs ONLY if welcome screen is NOT blocking
    // --------------------------------------------------------------

    // 2. Check auth status (wait for Firebase auth to be ready)
    if (window.auth) {
        // Firebase Auth object IS ready

        if (window.auth.currentUser) {
            // --------- USER IS LOGGED IN ---------
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
             } else {
                 console.error("setupDashboardEvents function not found! Dashboard buttons won't work.");
             }
            // --------- END LOGGED IN USER ---------

        } else {
            // --------- USER IS GUEST ---------
            // Auth is ready, but NO user is logged in
            console.log("Auth ready, user is guest.");
            // Guest flow is initiated by the 'Start Learning' button click.
            // The dashboard is shown *there*. We don't need to do anything here
            // unless there's specific guest initialization needed on load *after*
            // the welcome screen is dismissed (which is unlikely right now).
            // We do still need dashboard events setup if guest clicks "Start Learning"
            // which is handled in the button's event listener.
            // --------- END GUEST USER ---------
        }

    } else {
        // Firebase auth object itself is NOT ready yet. Retry.
        console.log("Firebase auth object not ready, retrying...");
        setTimeout(checkAuthAndInit, 1000);
    } // <<< Closing brace for if (window.auth)

  }; // <<< Correct closing brace for checkAuthAndInit function definition
  // --- END: Corrected checkAuthAndInit ---
  
      // Start checking for auth state *after* a slight delay to let splash/welcome logic run
  setTimeout(checkAuthAndInit, 500); // Delay the initial check slightly
  
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
      displayPerformance();
    });
  }
  
  // Bookmarks from user menu - start a bookmarks-only quiz
  const bookmarksFilterUser = document.getElementById("bookmarksFilterUser");
  if (bookmarksFilterUser) {
    bookmarksFilterUser.addEventListener("click", function(e) {
      e.preventDefault();
      closeUserMenu();
      if (typeof loadQuestions === 'function') {
        // Start a quiz with only bookmarked questions
        loadQuestions({
          bookmarksOnly: true,
          num: 50 // Large number to include all bookmarks
        });
      } // <<< *** THIS IS THE CORRECTED LINE - BRACE ADDED ***
    }); // Closes addEventListener
  } // Closes if (bookmarksFilterUser)
  
  
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
            data.stats = { totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0, categories: {}, totalTimeSpent: 0 };
            data.streaks = { lastAnsweredDate: null, currentStreak: 0, longestStreak: 0 };
            transaction.set(userDocRef, data, { merge: true });
          }
        });
        alert("Progress has been reset!");
        if (typeof updateUserCompositeScore === 'function') {
          updateUserCompositeScore();
        }
        window.updateUserMenu();
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
      document.getElementById("aboutView").style.display = "none";
      document.getElementById("faqView").style.display = "none";
      document.getElementById("customQuizForm").style.display = "block";
    });
  }
  
  // RANDOM QUIZ BUTTON => show modal
  const randomQuizBtn = document.getElementById("randomQuizBtn");
  if (randomQuizBtn) {
    randomQuizBtn.addEventListener("click", function() {
      window.filterMode = "all";
      closeSideMenu();
      document.getElementById("aboutView").style.display = "none";
      document.getElementById("faqView").style.display = "none";
      document.getElementById("randomQuizForm").style.display = "block";
    });
  }
  
  // START QUIZ (Custom) => hide modal, load quiz
  const startCustomQuiz = document.getElementById("startCustomQuiz");
  if (startCustomQuiz) {
    startCustomQuiz.addEventListener("click", function() {
      const categorySelect = document.getElementById("categorySelect");
      const customNumQuestions = document.getElementById("customNumQuestions");
      const includeAnsweredCheckbox = document.getElementById("includeAnsweredCheckbox");
      
      let category = categorySelect ? categorySelect.value : "";
      let numQuestions = customNumQuestions ? parseInt(customNumQuestions.value) || 10 : 10;
      let includeAnswered = includeAnsweredCheckbox ? includeAnsweredCheckbox.checked : false;
      
      const customQuizForm = document.getElementById("customQuizForm");
      if (customQuizForm) {
        customQuizForm.style.display = "none";
      }
      
      loadQuestions({
        type: 'custom',
        category: category,
        num: numQuestions,
        includeAnswered: includeAnswered
      });
    });
  }
  
  // CANCEL QUIZ (Custom)
  const cancelCustomQuiz = document.getElementById("cancelCustomQuiz");
  if (cancelCustomQuiz) {
    cancelCustomQuiz.addEventListener("click", function() {
      const customQuizForm = document.getElementById("customQuizForm");
      if (customQuizForm) {
        customQuizForm.style.display = "none";
      }
    });
  }
  
  // START QUIZ (Random) => hide modal, load quiz
  const startRandomQuiz = document.getElementById("startRandomQuiz");
  if (startRandomQuiz) {
    startRandomQuiz.addEventListener("click", function() {
      const randomNumQuestions = document.getElementById("randomNumQuestions");
      const includeAnsweredRandomCheckbox = document.getElementById("includeAnsweredRandomCheckbox");
      
      let numQuestions = randomNumQuestions ? parseInt(randomNumQuestions.value) || 10 : 10;
      let includeAnswered = includeAnsweredRandomCheckbox ? includeAnsweredRandomCheckbox.checked : false;
      
      const randomQuizForm = document.getElementById("randomQuizForm");
      if (randomQuizForm) {
        randomQuizForm.style.display = "none";
      }
      
      loadQuestions({
        type: 'random',
        num: numQuestions,
        includeAnswered: includeAnswered
      });
    });
  }
  
  // CANCEL QUIZ (Random)
  const cancelRandomQuiz = document.getElementById("cancelRandomQuiz");
  if (cancelRandomQuiz) {
    cancelRandomQuiz.addEventListener("click", function() {
      const randomQuizForm = document.getElementById("randomQuizForm");
      if (randomQuizForm) {
        randomQuizForm.style.display = "none";
      }
    });
  }
  
  // BOOKMARKS => now simply close the menu
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
  
  // LEADERBOARD
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
  
  // FAQ
  const faqItem = document.getElementById("faqItem");
  if (faqItem) {
    faqItem.addEventListener("click", function() {
      closeSideMenu();
      showFAQ();
    });
  }
  
  // ABOUT US
  const aboutItem = document.getElementById("aboutItem");
  if (aboutItem) {
    aboutItem.addEventListener("click", function() {
      closeSideMenu();
      showAbout();
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
  
  // Side menu toggling - this is the crucial part that was causing the issue
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
      closeUserMenu();
    });
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
  
  // FEEDBACK button
  const feedbackButton = document.getElementById("feedbackButton");
  if (feedbackButton) {
    feedbackButton.addEventListener("click", function() {
      const questionId = getCurrentQuestionId();
      const questionSlide = document.querySelector(`.swiper-slide[data-id="${questionId}"]`);
      let questionText = "";
      if (questionSlide) {
        const questionElem = questionSlide.querySelector(".question");
        if (questionElem) {
          questionText = questionElem.textContent.trim();
        }
      }
      currentFeedbackQuestionId = questionId || "";
      currentFeedbackQuestionText = questionText || "";
      
      const feedbackQuestionInfo = document.getElementById("feedbackQuestionInfo");
      if (feedbackQuestionInfo) {
        feedbackQuestionInfo.textContent = `Feedback for Q: ${currentFeedbackQuestionText}`;
      }
      
      const feedbackModal = document.getElementById("feedbackModal");
      if (feedbackModal) {
        feedbackModal.style.display = "flex";
      }
    });
  }
  
  // FEEDBACK modal close
  const closeFeedbackModal = document.getElementById("closeFeedbackModal");
  if (closeFeedbackModal) {
    closeFeedbackModal.addEventListener("click", function() {
      const feedbackModal = document.getElementById("feedbackModal");
      if (feedbackModal) {
        feedbackModal.style.display = "none";
      }
    });
  }
  
  // FEEDBACK submit
  const submitFeedback = document.getElementById("submitFeedback");
  if (submitFeedback) {
    submitFeedback.addEventListener("click", async function() {
      const feedbackText = document.getElementById("feedbackText");
      if (!feedbackText || !feedbackText.value.trim()) {
        alert("Please enter your feedback.");
        return;
      }
      
      try {
        await window.addDoc(window.collection(window.db, "feedback"), {
          questionId: currentFeedbackQuestionId,
          questionText: currentFeedbackQuestionText,
          feedback: feedbackText.value.trim(),
          timestamp: window.serverTimestamp()
        });
        alert("Thank you for your feedback!");
        
        if (feedbackText) {
          feedbackText.value = "";
        }
        
        const feedbackModal = document.getElementById("feedbackModal");
        if (feedbackModal) {
          feedbackModal.style.display = "none";
        }
      } catch (error) {
        console.error("Error submitting feedback:", error);
        alert("There was an error submitting your feedback. Please try again later.");
      }
    });
  }
  
  // FAVORITE button (bookmark functionality)
  const favoriteButton = document.getElementById("favoriteButton");
  if (favoriteButton) {
    favoriteButton.addEventListener("click", async function() {
      // TODO: Add guest check here later
        if (!window.auth || !window.auth.currentUser) {
            alert("Bookmarking requires an account. Please sign up to save your favorite questions!");
            return;
        }
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
    });
  }
  
  // CONTACT modal buttons
  const submitContact = document.getElementById("submitContact");
  if (submitContact) {
    submitContact.addEventListener("click", async function() {
      const contactEmail = document.getElementById("contactEmail");
      const contactMessage = document.getElementById("contactMessage");
      
      const email = contactEmail ? contactEmail.value.trim() : "";
      const message = contactMessage ? contactMessage.value.trim() : "";
      
      if (!message) {
        alert("Please enter your message.");
        return;
      }
      
      try {
        if (!window.auth || !window.auth.currentUser) {
          alert("User not authenticated. Please try again later.");
          return;
        }
        
        await window.addDoc(window.collection(window.db, "contact"), {
          email: email,
          message: message,
          timestamp: window.serverTimestamp(),
          userId: window.auth.currentUser.uid
        });
        alert("Thank you for contacting us!");
        
        if (contactEmail) contactEmail.value = "";
        if (contactMessage) contactMessage.value = "";
        
        const contactModal = document.getElementById("contactModal");
        if (contactModal) {
          contactModal.style.display = "none";
        }
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
      if (contactModal) {
        contactModal.style.display = "none";
      }
    });
  }
  
  // Clean up any existing LEVEL UP text on page load
  const textNodes = document.querySelectorAll('body > *:not([id])');
  textNodes.forEach(node => {
    if (node.textContent && node.textContent.includes('LEVEL UP')) {
      node.remove();
    }
  });

  // --- START ADDITION: Registration Prompt Modal Listeners ---
  const registrationPromptModal = document.getElementById('registrationPromptModal');
  const promptSignUpBtn = document.getElementById('promptSignUpBtn');
  const promptContinueGuestBtn = document.getElementById('promptContinueGuestBtn');
  // const promptCloseBtn = document.getElementById('promptCloseBtn'); // If you added a close button

  if (registrationPromptModal) {
      if (promptSignUpBtn) {
          promptSignUpBtn.addEventListener('click', function() {
              // TODO: Implement actual Sign Up / Login flow
              alert('Sign Up / Login flow will be added here!');
              registrationPromptModal.style.opacity = '0';
              setTimeout(() => { registrationPromptModal.style.display = 'none'; }, 300);
          });
      }

      if (promptContinueGuestBtn) {
          promptContinueGuestBtn.addEventListener('click', function() {
              // Simply hide the modal
              registrationPromptModal.style.opacity = '0';
              setTimeout(() => { registrationPromptModal.style.display = 'none'; }, 300); // Hide after fade
          });
      }

// Function to update the level progress circles and bar
function updateLevelProgress(percent) {
  // Update the level progress circles
  const levelCircleProgress = document.getElementById("levelCircleProgress");
  const userLevelProgress = document.getElementById("userLevelProgress");
  
  if (levelCircleProgress) {
    levelCircleProgress.style.setProperty('--progress', `${percent}%`);
  }
  
  if (userLevelProgress) {
    userLevelProgress.style.setProperty('--progress', `${percent}%`);
  }
  
  // Update the horizontal progress bar
  const levelProgressBar = document.getElementById("levelProgressBar");
  if (levelProgressBar) {
    levelProgressBar.style.width = `${percent}%`;
  }
}

// Function to check if a user's streak should be reset due to inactivity
async function checkAndUpdateStreak() {
  if (!window.auth || !window.auth.currentUser) {
    console.log("User not authenticated yet");
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
        
        // Update UI to show reset streak
        const currentStreakElement = document.getElementById("currentStreak");
        if (currentStreakElement) {
          currentStreakElement.textContent = "0";
        }
      }
    });
  } catch (error) {
    console.error("Error checking streak:", error);
  }
}

// Function to load leaderboard preview data - fixed for desktop view
async function loadLeaderboardPreview() {
  if (!window.auth || !window.auth.currentUser || !window.db) {
    console.log("Auth or DB not initialized for leaderboard preview");
    return;
  }
  
  const leaderboardPreview = document.getElementById("leaderboardPreview");
  if (!leaderboardPreview) return;
  
  try {
    const currentUid = window.auth.currentUser.uid;
    const querySnapshot = await window.getDocs(window.collection(window.db, 'users'));
    let leaderboardEntries = [];
    
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.stats) {
        // Use total XP instead of weekly XP calculation
        let xp = data.stats.xp || 0;
        
        // Add user to leaderboard entries with their total XP
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
    let currentUserRank = leaderboardEntries.findIndex(e => e.uid === currentUid) + 1;
    let currentUserEntry = leaderboardEntries.find(e => e.uid === currentUid);
    let showCurrentUser = currentUserRank > 3 && currentUserEntry;
    
    // Create HTML for the preview with well-structured entries
    let html = '';
    
    // Remove the weekly indicator header
    
    // Add top 3 entries
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
              <div class="leaderboard-username">${entry.username}</div>
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
  if (!window.auth || !window.auth.currentUser || !window.db) {
    console.log("Auth or DB not initialized for dashboard");
    setTimeout(initializeDashboard, 1000);
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
      const progress = calculateLevelProgress(xp);
      
      // Set level number
      const dashboardLevel = document.getElementById("dashboardLevel");
      if (dashboardLevel) {
        dashboardLevel.textContent = level;
      }
      
      // Set XP display
      const dashboardXP = document.getElementById("dashboardXP");
      if (dashboardXP) {
        dashboardXP.textContent = `${xp} XP`;
      }
      
      // Set next level info
      const dashboardNextLevel = document.getElementById("dashboardNextLevel");
      if (dashboardNextLevel) {
        const levelInfo = getLevelInfo(level);
        if (levelInfo.nextLevelXp) {
          const xpNeeded = levelInfo.nextLevelXp - xp;
          dashboardNextLevel.textContent = `${xpNeeded} XP to Level ${level + 1}`;
        } else {
          dashboardNextLevel.textContent = 'Max Level Reached!';
        }
      }
      
      // Update progress circle
      const dashboardLevelProgress = document.getElementById("dashboardLevelProgress");
      if (dashboardLevelProgress) {
        dashboardLevelProgress.style.setProperty('--progress', `${progress}%`);
      }
      
      // Update quick stats
      const totalAnswered = stats.totalAnswered || 0;
      const totalCorrect = stats.totalCorrect || 0;
      const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
      
      const dashboardAnswered = document.getElementById("dashboardAnswered");
      if (dashboardAnswered) {
        dashboardAnswered.textContent = totalAnswered;
      }
      
      const dashboardAccuracy = document.getElementById("dashboardAccuracy");
      if (dashboardAccuracy) {
        dashboardAccuracy.textContent = `${accuracy}%`;
      }
      
      // Update streak display
      const currentStreak = document.getElementById("currentStreak");
      if (currentStreak) {
        currentStreak.textContent = streaks.currentStreak || 0;
      }
      
      // Generate streak calendar
      fixStreakCalendar(data.streaks);
      
      // Also load leaderboard preview
      loadLeaderboardPreview();

      // Also load review queue data
updateReviewQueue();
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

// Function to count questions due for review today
async function countDueReviews() {
  if (!window.auth || !window.auth.currentUser || !window.db) {
    console.log("Auth or DB not initialized for counting reviews");
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
    
    // Get current date (just the date portion, no time)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Create tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    let dueCount = 0;
    let nextReviewDate = null;
    
    // Loop through all questions in spaced repetition data
    for (const questionId in spacedRepetitionData) {
      const reviewData = spacedRepetitionData[questionId];
      if (!reviewData || !reviewData.nextReviewDate) continue;
      
      const reviewDate = new Date(reviewData.nextReviewDate);
      
      // Check if review date is today or earlier by comparing just the date portions
      const reviewDateOnly = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
      
      if (reviewDateOnly <= today) {
        dueCount++;
      } 
      // Only consider dates AFTER today for "next review date"
      else if (reviewDateOnly >= tomorrow && (!nextReviewDate || reviewDateOnly < nextReviewDate)) {
        nextReviewDate = reviewDateOnly;
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
  const reviewCount = document.getElementById("reviewCount");
  const reviewQueueContent = document.getElementById("reviewQueueContent");
  const reviewProgressBar = document.getElementById("reviewProgressBar");
  
  if (!reviewCount || !reviewQueueContent || !reviewProgressBar) return;
  
  // Get count of due reviews
  const { dueCount, nextReviewDate } = await countDueReviews();
  
  if (dueCount > 0) {
    // Update the count and progress bar
    reviewCount.textContent = dueCount;
    
    // Simple progress calculation - assuming most people won't have more than 20 reviews
    const progressPercent = Math.min(100, (dueCount / 20) * 100);
    reviewProgressBar.style.width = `${progressPercent}%`;
    
    // Clear any previous empty state message
    const existingEmptyState = reviewQueueContent.querySelector(".review-empty-state");
    if (existingEmptyState) {
      existingEmptyState.remove();
    }
  } else {
    // No reviews due - show empty state
    reviewCount.textContent = "0";
    reviewProgressBar.style.width = "0%";
    
    // Check if empty state message already exists
    let emptyState = reviewQueueContent.querySelector(".review-empty-state");
    
    if (!emptyState) {
      // Create empty state message
      emptyState = document.createElement("div");
      emptyState.className = "review-empty-state";
      
      if (nextReviewDate) {
        const formattedDate = nextReviewDate.toLocaleDateString();
        emptyState.innerHTML = `No reviews due today.<br>Next review: <span class="next-review-date">${formattedDate}</span>`;
      } else {
        emptyState.textContent = "No reviews scheduled. Complete more quizzes to add reviews.";
      }
      
      // Insert after review stats
      const reviewStats = reviewQueueContent.querySelector(".review-stats");
      if (reviewStats) {
        reviewStats.insertAdjacentElement('afterend', emptyState);
      } else {
        reviewQueueContent.appendChild(emptyState);
      }
    }
  }
}

// Set up event listeners for dashboard
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
    // Get count of due reviews
    const { dueCount } = await countDueReviews();
    
    if (dueCount === 0) {
      alert("You have no questions due for review today. Good job!");
      return;
    }
    
    // We need to get the actual due question IDs
    const dueQuestionIds = await getDueQuestionIds();
    
    if (dueQuestionIds.length === 0) {
      alert("No questions found for review. Please try again later.");
      return;
    }
    
    // Load ONLY the specific due questions, not mixed with new questions
    loadSpecificQuestions(dueQuestionIds);
  });
  } else {
    console.warn("reviewQueueCard not found");
  }
}

// Function to fix streak calendar alignment
function fixStreakCalendar(streaks) {
  // Get the streak calendar element
  const streakCalendar = document.getElementById("streakCalendar");
  if (!streakCalendar) {
    console.error("Streak calendar element not found");
    return;
  }
  
  // Clear existing circles
  streakCalendar.innerHTML = '';
  
  // Get today's date
  const today = new Date();
  
  // Convert JavaScript's day (0=Sunday, 6=Saturday) to our display format (0=Monday, 6=Sunday)
  let todayDayIndex = today.getDay() - 1; // Convert from JS day to our index
  if (todayDayIndex < 0) todayDayIndex = 6; // Handle Sunday (becomes 6)
  
  console.log("Today:", today);
  console.log("Day of week (0=Sun, 6=Sat):", today.getDay());
  console.log("Our day index (0=Mon, 6=Sun):", todayDayIndex);
  
  // Generate all the days of the week
  for (let i = 0; i < 7; i++) {
    // Calculate the date offset from today
    // i is the position in our display (0=Monday, 6=Sunday)
    // todayDayIndex is today's position in our display
    const offset = i - todayDayIndex;
    
    // Create the date for this position
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    
    // Create the day circle
    const dayCircle = document.createElement("div");
    dayCircle.className = "day-circle";
    
    // If this is today, add the today class
    if (offset === 0) {
      dayCircle.classList.add("today");
    }
    
    // Check if this day is active in the streak
    if (streaks && streaks.currentStreak > 0) {
      const dayDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
      if (dayDiff >= 0 && dayDiff < streaks.currentStreak) {
        dayCircle.classList.add("active");
      }
    }
    
    // Set the date number as the content
    dayCircle.textContent = date.getDate();
    
    // Add to the calendar
    streakCalendar.appendChild(dayCircle);
  }
}

// Function to get IDs of questions due for review
async function getDueQuestionIds() {
  if (!window.auth || !window.auth.currentUser || !window.db) {
    return [];
  }
  
  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      return [];
    }
    
    const data = userDocSnap.data();
    const spacedRepetitionData = data.spacedRepetition || {};
    
    // Get current date (just the date portion, no time)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let dueQuestionIds = [];
    
    // Loop through all questions in spaced repetition data
    for (const questionId in spacedRepetitionData) {
      const reviewData = spacedRepetitionData[questionId];
      if (!reviewData || !reviewData.nextReviewDate) continue;
      
      const reviewDate = new Date(reviewData.nextReviewDate);
      
      // Check if review date is today or earlier by comparing just the date portions
      const reviewDateOnly = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
      
      if (reviewDateOnly <= today) {
        dueQuestionIds.push(questionId);
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
  
  // Fetch all questions from CSV
  Papa.parse(csvUrl, {
    download: true,
    header: true,
    complete: function(results) {
      console.log("All questions loaded:", results.data.length);
      
      // Filter only the questions that are due for review
      const reviewQuestions = results.data.filter(q => 
        questionIds.includes(q["Question"].trim())
      );
      
      console.log("Filtered review questions:", reviewQuestions.length);
      
      if (reviewQuestions.length === 0) {
        alert("No review questions found. This might be because questions have been removed from the question bank.");
        return;
      }
      
      // Shuffle the review questions for a better learning experience
      const shuffledReviewQuestions = shuffleArray([...reviewQuestions]);
      
      // Initialize the quiz with only these specific review questions
      initializeQuiz(shuffledReviewQuestions);
    },
    error: function(error) {
      console.error("Error parsing CSV:", error);
      alert("Error loading questions. Please try again later.");
    }
  });
}

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
});
}); // This closes window.addEventListener('load', function() { ... });
