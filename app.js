// Add preview mode flag
window.isPreviewMode = false;

// Add splash screen and welcome screen functionality
document.addEventListener('DOMContentLoaded', function() {
  const splashScreen = document.getElementById('splashScreen');
  const welcomeScreen = document.getElementById('welcomeScreen');
  
  // Hide splash screen after 2 seconds
  setTimeout(function() {
    if (splashScreen) {
      splashScreen.classList.add('fade-out');
      
      // Remove from DOM after fade-out animation completes
      setTimeout(function() {
        splashScreen.style.display = 'none';
      }, 500); // Matches the transition duration in CSS
    }
  }, 2000);
  
 // Initialize the Get Started button
const getStartedBtn = document.getElementById('getStartedBtn');
if (getStartedBtn) {
  getStartedBtn.addEventListener('click', function() {
    console.log("Get Started clicked");
    
    // Hide the welcome screen
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }
    
    // Show loading screen
    document.getElementById('loadingScreen').style.display = 'flex';
    
    // Delay before starting quiz to show loading screen
    setTimeout(() => {
      // Set preview mode flag
      window.isPreviewMode = true;
      setToolbarToPreviewMode();
      console.log("Preview mode set to:", window.isPreviewMode);
      
      // Load preview questions
      try {
        Papa.parse(csvUrl, {
          download: true,
          header: true,
          complete: function(results) {
            console.log("Questions loaded for preview:", results.data.length);
            
            // Shuffle all questions
            let allQuestions = shuffleArray(results.data);
            
            // Take just 3 random questions for the preview
            let previewQuestions = allQuestions.slice(0, 3);
            
            console.log("Selected 3 preview questions");
            
            // Hide loading screen
            document.getElementById('loadingScreen').style.display = 'none';
            
            // Initialize the quiz with only these 3 questions
            initializeQuiz(previewQuestions);
            
            // Show appropriate UI elements
            document.querySelector(".swiper").style.display = "block";
            document.getElementById("bottomToolbar").style.display = "flex";
            document.getElementById("iconBar").style.display = "flex";
          },
          error: function(error) {
            console.error("Error parsing CSV:", error);
            alert("Error loading questions. Please try again later.");
            
            // Hide loading screen and show dashboard on error
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainOptions').style.display = 'flex';
          }
        });
      } catch (error) {
        console.error("Error in quiz initialization:", error);
        
        // Hide loading screen and show dashboard on error
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainOptions').style.display = 'flex';
      }
    }, 1500);
  });
}
  
  // Initialize signup functionality
  initializeSignup();
});

// Function to load a preview quiz with 3 questions
function loadPreviewQuiz() {
  console.log("Loading preview quiz with 3 questions");

  // Set the preview mode flag
  window.isPreviewMode = true;
  setToolbarToPreviewMode();
  
  console.log("Preview mode set to:", window.isPreviewMode);
  
  try {
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: async function(results) {
        console.log("Questions loaded for preview:", results.data.length);
        
        // Shuffle all questions
        let allQuestions = shuffleArray(results.data);
        
        // Take just 3 random questions for the preview
        let previewQuestions = allQuestions.slice(0, 3);
        
        console.log("Selected 3 preview questions");
        
        // Initialize the quiz with only these 3 questions
        initializeQuiz(previewQuestions);
        
        // Show appropriate UI elements
        document.querySelector(".swiper").style.display = "block";
        document.getElementById("bottomToolbar").style.display = "flex";
        document.getElementById("iconBar").style.display = "flex";
      },
      error: function(error) {
        console.error("Error parsing CSV:", error);
        alert("Error loading questions. Please try again later.");
      }
    });
  } catch (error) {
    console.error("Error in loadPreviewQuiz:", error);
    alert("Error loading quiz: " + error.message);
  }
}

// Add this to app.js after the loadPreviewQuiz function
function loadPreviewFinishScreen() {
  // Create a new slide for the registration CTA
  const registrationSlide = document.createElement("div");
  registrationSlide.className = "swiper-slide";
  registrationSlide.innerHTML = `
    <div class="card">
      <div class="registration-cta">
        <h2>Nice work!</h2>
        <p>Let's create your profile so that you can save your progress, track XPs, and join the leaderboard. You can also continue as a guest, but your progress won't be saved.</p>
        <button id="createProfileBtn" class="welcome-btn">Create Your Profile</button>
        <div class="or-divider">OR</div>
        <div id="continueAsGuest" class="guest-option">Continue as Guest</div>
      </div>
    </div>
  `;
  
  // Add the slide to the DOM
  document.getElementById("quizSlides").appendChild(registrationSlide);
  
  // Update Swiper to recognize the new slide
  window.mySwiper.update();
  
  // Add event listeners to the buttons
  registrationSlide.querySelector("#createProfileBtn").addEventListener("click", function() {
    // Handle profile creation (implement this later)
    console.log("Create profile clicked");
    
    // For now, just go to the main dashboard
    document.querySelector(".swiper").style.display = "none";
    document.getElementById("bottomToolbar").style.display = "none";
    document.getElementById("iconBar").style.display = "none";
    document.getElementById("mainOptions").style.display = "flex";
  });
  
  registrationSlide.querySelector("#continueAsGuest").addEventListener("click", function() {
    // Handle guest continuation (implement this later)
    console.log("Continue as guest clicked");
    
    // For now, just go to the main dashboard
    document.querySelector(".swiper").style.display = "none";
    document.getElementById("bottomToolbar").style.display = "none";
    document.getElementById("iconBar").style.display = "none";
    document.getElementById("mainOptions").style.display = "flex";
  });
  window.isPreviewMode = false; // Reset preview mode flag
}

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
  const checkAuthAndInit = function() {
    if (window.auth && window.auth.currentUser) {
      // Initialize user menu with username
      window.updateUserMenu();
    } else {
      // If auth isn't ready yet, check again in 1 second
      setTimeout(checkAuthAndInit, 1000);
    }
  };
  
  // Start checking for auth
  checkAuthAndInit();
  
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
      
      // Start a quiz with only bookmarked questions
      loadQuestions({
        bookmarksOnly: true,
        num: 50 // Large number to include all bookmarks
      });
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
      closeSideMenu();
    });
  }
  
  // START NEW QUIZ from side menu
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
    });
  }
  
  // LEADERBOARD
  const leaderboardItem = document.getElementById("leaderboardItem");
  if (leaderboardItem) {
    leaderboardItem.addEventListener("click", function() {
      closeSideMenu();
      showLeaderboard();
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
      
      showContactModal();
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
  
  // Logo click => go to main menu
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
});

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

// Update user XP display function call
window.addEventListener('load', function() {
  // Call after Firebase auth is initialized
  setTimeout(() => {
    if (window.auth && window.auth.currentUser) {
      if (typeof updateUserXP === 'function') {
        updateUserXP();
      } else if (typeof window.updateUserXP === 'function') {
        window.updateUserXP();
      }
    }
  }, 2000);
});

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
      // ONLY include registered users in leaderboard preview
      if (data.stats && data.isRegistered === true) {
        // Use total XP for ranking
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
    let showCurrentUser = currentUserRank > 3 && currentUserEntry && !window.auth.currentUser.isAnonymous;
    
    // Create HTML for the preview with well-structured entries
    let html = '';
    
    // Add top 3 entries
    if (top3.length === 0) {
      if (window.auth.currentUser.isAnonymous) {
        html = '<div class="leaderboard-loading">Create an account to join the leaderboard!</div>';
      } else {
        html = '<div class="leaderboard-loading">No leaderboard data yet</div>';
      }
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
  // Start Quiz button
  const startQuizBtn = document.getElementById("startQuizBtn");
  if (startQuizBtn) {
    startQuizBtn.addEventListener("click", function() {
      document.getElementById("quizSetupModal").style.display = "block";
    });
  }
  
  // Modal Start Quiz button
  const modalStartQuiz = document.getElementById("modalStartQuiz");
if (modalStartQuiz) {
  modalStartQuiz.addEventListener("click", function() {
    const category = document.getElementById("modalCategorySelect").value;
    const numQuestions = parseInt(document.getElementById("modalNumQuestions").value) || 10;
    const includeAnswered = document.getElementById("modalIncludeAnswered").checked;
    
    document.getElementById("quizSetupModal").style.display = "none";
    window.isPreviewMode = false; // Reset preview mode flag

    // Update this part to include the spaced repetition option
    const useSpacedRepetition = document.getElementById("modalSpacedRepetition").checked;
    
    loadQuestions({
      type: category ? 'custom' : 'random',
      category: category,
      num: numQuestions,
      includeAnswered: includeAnswered,
      spacedRepetition: useSpacedRepetition
    });
  });
} // <-- Add this closing curly brace
  
  // Modal Cancel button
  const modalCancelQuiz = document.getElementById("modalCancelQuiz");
  if (modalCancelQuiz) {
    modalCancelQuiz.addEventListener("click", function() {
      document.getElementById("quizSetupModal").style.display = "none";
    });
  }
  
  // User Progress card click - go to Performance
  const userProgressCard = document.getElementById("userProgressCard");
  if (userProgressCard) {
    userProgressCard.addEventListener("click", function() {
      displayPerformance();
    });
  }
  
  // Quick Stats card click - go to Performance
  const quickStatsCard = document.getElementById("quickStatsCard");
  if (quickStatsCard) {
    quickStatsCard.addEventListener("click", function() {
      displayPerformance();
    });
  }
  
  // Leaderboard Preview card click - go to Leaderboard
  const leaderboardPreviewCard = document.getElementById("leaderboardPreviewCard");
  if (leaderboardPreviewCard) {
    leaderboardPreviewCard.addEventListener("click", function() {
      showLeaderboard();
    });
  }
  // Review Queue card click - start review
const reviewQueueCard = document.getElementById("reviewQueueCard");
if (reviewQueueCard) {
  reviewQueueCard.addEventListener("click", async function() {
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

// Initialize the app
window.addEventListener('load', function() {
  // Check streak after Firebase auth is initialized
  const checkAuthAndInitAll = function() {
    if (window.auth && window.auth.currentUser) {
      checkAndUpdateStreak();
      setupDashboardEvents();
      initializeDashboard();
    } else {
      // If auth isn't ready yet, check again in 1 second
      setTimeout(checkAuthAndInitAll, 1000);
    }
  };
  
  // Start checking for auth
  checkAuthAndInitAll();
  
  // Also try after a delay to ensure all DOM elements are ready
  setTimeout(function() {
    setupDashboardEvents();
    initializeDashboard();
  }, 2000);
});

// Function to show the signup screen
function showSignupScreen() {
  // Hide other screens
  const welcomeScreen = document.getElementById('welcomeScreen');
  const swiper = document.querySelector('.swiper');
  const bottomToolbar = document.getElementById('bottomToolbar');
  const iconBar = document.getElementById('iconBar');
  
  if (welcomeScreen) welcomeScreen.style.display = 'none';
  if (swiper) swiper.style.display = 'none';
  if (bottomToolbar) bottomToolbar.style.display = 'none';
  if (iconBar) iconBar.style.display = 'none';
  
  // Show signup screen
  const signupScreen = document.getElementById('signupScreen');
  if (signupScreen) signupScreen.style.display = 'flex';
  
  // Reset form
  document.getElementById('usernameInput').value = '';
  document.getElementById('usernameMessage').textContent = '';
  document.getElementById('usernameMessage').className = 'input-message';
  
  document.getElementById('emailInput').value = '';
  document.getElementById('emailMessage').textContent = '';
  document.getElementById('emailMessage').className = 'input-message';
  
  document.getElementById('passwordInput').value = '';
  document.getElementById('passwordMessage').textContent = '';
  document.getElementById('passwordMessage').className = 'input-message';
}

// Initialize signup functionality
function initializeSignup() {
  // Username validation
  const usernameInput = document.getElementById('usernameInput');
  if (usernameInput) {
    usernameInput.addEventListener('input', function() {
      validateUsername(this.value);
    });
  }
  
  // Email validation
  const emailInput = document.getElementById('emailInput');
  if (emailInput) {
    emailInput.addEventListener('input', function() {
      validateEmail(this.value);
    });
  }

  // Add back button functionality to signup screen
const backFromSignup = document.getElementById('backFromSignup');
if (backFromSignup) {
  backFromSignup.addEventListener('click', function() {
    // Hide signup screen
    document.getElementById('signupScreen').style.display = 'none';
    
    // If coming from quiz, show swiper again
    if (window.isPreviewMode) {
      document.querySelector(".swiper").style.display = "block";
      document.getElementById("bottomToolbar").style.display = "flex";
      document.getElementById("iconBar").style.display = "flex";
    } else {
      // Otherwise show welcome screen
      document.getElementById('welcomeScreen').style.display = 'flex';
    }
  });
}
  
  // Password validation
  const passwordInput = document.getElementById('passwordInput');
  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      validatePassword(this.value);
    });
  }
  
 // Update the createAccountBtn event listener to include training level
document.getElementById('createAccountBtn').addEventListener('click', async function() {
  if (validateSignup()) {
    const username = document.getElementById('usernameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const trainingLevel = document.getElementById('trainingLevelSelect').value;
    
    try {
      // Show loading state
      const createAccountBtn = document.getElementById('createAccountBtn');
      createAccountBtn.textContent = "Creating Account...";
      createAccountBtn.disabled = true;
      
      // Register with email/password and include training level
      await registerWithEmailPassword(username, email, password, trainingLevel);
      
      // Show success message
      alert('Account created successfully!');
      
      // Hide signup screen and show dashboard
      document.getElementById('signupScreen').style.display = 'none';
      document.getElementById('mainOptions').style.display = 'flex';
      
      // Update user menu
      if (typeof updateUserMenu === 'function') {
        updateUserMenu();
      }
    } catch (error) {
      // Handle specific error types
      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already in use. Please try another email or sign in.');
      } else {
        alert('Error creating account: ' + error.message);
      }
      console.error("Registration error:", error);
    } finally {
      // Reset button state
      const createAccountBtn = document.getElementById('createAccountBtn');
      createAccountBtn.textContent = "Create Account";
      createAccountBtn.disabled = false;
    }
  }
});
  
  // Social auth buttons
  const googleAuthBtn = document.getElementById('googleAuthBtn');
  if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', function() {
      console.log('Google auth clicked');
      alert('Google authentication to be implemented');
    });
  }
  
  const appleAuthBtn = document.getElementById('appleAuthBtn');
  if (appleAuthBtn) {
    appleAuthBtn.addEventListener('click', function() {
      console.log('Apple auth clicked');
      alert('Apple authentication to be implemented');
    });
  }
}

// Validation helper functions
function validateUsername(username) {
  const usernameMessage = document.getElementById('usernameMessage');
  
  if (username.length < 3) {
    usernameMessage.textContent = 'Username must be at least 3 characters';
    usernameMessage.className = 'input-message error';
    return false;
  } else if (username.length > 20) {
    usernameMessage.textContent = 'Username must be less than 20 characters';
    usernameMessage.className = 'input-message error';
    return false;
  } else {
    // Here you would normally check if username is available
    // For now, we'll simulate it with a simple check
    if (username === 'admin' || username === 'test') {
      usernameMessage.textContent = 'This username is already taken';
      usernameMessage.className = 'input-message error';
      return false;
    } else {
      usernameMessage.textContent = 'Username is available';
      usernameMessage.className = 'input-message success';
      return true;
    }
  }
}

function validateEmail(email) {
  const emailMessage = document.getElementById('emailMessage');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    emailMessage.textContent = 'Email is required';
    emailMessage.className = 'input-message error';
    return false;
  } else if (!emailRegex.test(email)) {
    emailMessage.textContent = 'Please enter a valid email address';
    emailMessage.className = 'input-message error';
    return false;
  } else {
    emailMessage.textContent = '';
    return true;
  }
}

function validatePassword(password) {
  const passwordMessage = document.getElementById('passwordMessage');
  
  if (!password) {
    passwordMessage.textContent = 'Password is required';
    passwordMessage.className = 'input-message error';
    return false;
  } else if (password.length < 6) {
    passwordMessage.textContent = 'Password must be at least 6 characters';
    passwordMessage.className = 'input-message error';
    return false;
  } else {
    passwordMessage.textContent = '';
    return true;
  }
}

// Updated function to register user with email/password and training level
async function registerWithEmailPassword(username, email, password, trainingLevel) {
  try {
    // Check if user is already signed in anonymously
    const currentUser = window.auth.currentUser;
    let anonymousUid = null;
    
    if (currentUser && currentUser.isAnonymous) {
      anonymousUid = currentUser.uid;
      console.log("Current user is anonymous:", anonymousUid);
      
      // Get the anonymous user data before signing out
      const anonymousDocRef = window.doc(window.db, 'users', anonymousUid);
      const anonymousDocSnap = await window.getDoc(anonymousDocRef);
      let anonymousData = null;
      
      if (anonymousDocSnap.exists()) {
        anonymousData = anonymousDocSnap.data();
        console.log("Retrieved anonymous data");
      }
      
      // Sign out the anonymous user
      await window.auth.signOut();
      
      // Create new account with email and password
      const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
      const user = userCredential.user;
      
      console.log("Account created for:", user.uid);
      
      // Update user profile with username
      await window.updateProfile(user, {
        displayName: username
      });
      
      console.log("Profile updated with username:", username);
      
      // If we had anonymous data, migrate it
      if (anonymousData) {
        // Make a copy of the anonymous data
        const newUserData = { ...anonymousData };
        
        // IMPORTANT: Overwrite the username with the chosen username
        newUserData.username = username;
        newUserData.trainingLevel = trainingLevel;
        
        // Set other registration fields
        newUserData.email = email;
        newUserData.isRegistered = true;
        newUserData.previousAnonymousUid = anonymousUid;
        newUserData.createdAt = window.serverTimestamp();
        
        // Set the data to the new user document
        const registeredDocRef = window.doc(window.db, 'users', user.uid);
        await window.setDoc(registeredDocRef, newUserData);
        
        console.log("Data migration complete with username:", username);
      } else {
        // Create a new user document
        createNewUserDocument(user.uid, username, email, trainingLevel);
      }
    } else {
      // Normal registration flow (not previously anonymous)
      const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
      const user = userCredential.user;
      
      console.log("Account created for:", user.uid);
      
      // Update user profile with username
      await window.updateProfile(user, {
        displayName: username
      });
      
      // Create a new user document
      createNewUserDocument(user.uid, username, email, trainingLevel);
    }
    
    return true;
  } catch (error) {
    console.error("Error during registration:", error);
    throw error;
  }
}

// Updated helper function to create a new user document with training level
async function createNewUserDocument(userId, username, email, trainingLevel) {
  const userDocRef = window.doc(window.db, 'users', userId);
  await window.setDoc(userDocRef, {
    username: username,
    email: email,
    trainingLevel: trainingLevel,
    createdAt: window.serverTimestamp(),
    isRegistered: true,
    stats: { 
      totalAnswered: 0, 
      totalCorrect: 0, 
      totalIncorrect: 0, 
      categories: {}, 
      totalTimeSpent: 0,
      xp: 0,
      level: 1
    },
    streaks: { 
      lastAnsweredDate: null, 
      currentStreak: 0, 
      longestStreak: 0 
    }
  });
  
  console.log("Created new user document with username and training level");
}

// Connect Create Profile button in the registration CTA to the signup screen
document.addEventListener('DOMContentLoaded', function() {
  // Initialize signup functionality
  initializeSignup();
  
  // Update the "Create Your Profile" button click handler to show signup
  const createProfileBtnCheck = setInterval(function() {
    const createProfileBtn = document.getElementById('createProfileBtn');
    if (createProfileBtn) {
      clearInterval(createProfileBtnCheck);
      
      // Replace existing event listener
      createProfileBtn.replaceWith(createProfileBtn.cloneNode(true));
      
      // Add new event listener
      document.getElementById('createProfileBtn').addEventListener('click', function() {
        console.log('Create profile clicked');
        showSignupScreen();
      });
      window.isPreviewMode = false; // Reset preview mode flag
    }
  }, 1000); // Check every second until button is available
});

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

// Function to register user with email/password
async function registerWithEmailPassword(username, email, password) {
  try {
    // Check if user is already signed in anonymously
    const currentUser = window.auth.currentUser;
    let anonymousUid = null;
    
    if (currentUser && currentUser.isAnonymous) {
      anonymousUid = currentUser.uid;
      console.log("Current user is anonymous:", anonymousUid);
    }
    
    // Create new account with email and password
    const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
    const user = userCredential.user;
    
    console.log("Account created for:", user.uid);
    
    // Update user profile with username
    await window.updateProfile(user, {
      displayName: username
    });
    
    console.log("Profile updated with username:", username);
    
    // If there was anonymous data, migrate it
    if (anonymousUid) {
      await migrateAnonymousData(anonymousUid, user.uid);
    } else {
      // Create a new user document with the username
      const userDocRef = window.doc(window.db, 'users', user.uid);
      await window.setDoc(userDocRef, {
        username: username,
        email: email,
        createdAt: window.serverTimestamp(),
        isRegistered: true,
        stats: { 
          totalAnswered: 0, 
          totalCorrect: 0, 
          totalIncorrect: 0, 
          categories: {}, 
          totalTimeSpent: 0,
          xp: 0,
          level: 1
        },
        streaks: { 
          lastAnsweredDate: null, 
          currentStreak: 0, 
          longestStreak: 0 
        }
      });
    }
    
    return user;
  } catch (error) {
    console.error("Error during registration:", error);
    throw error;
  }
}

// Function to migrate anonymous user data to registered user
async function migrateAnonymousData(anonymousUid, registeredUid) {
  try {
    console.log(`Migrating data from ${anonymousUid} to ${registeredUid}`);
    
    // Get the anonymous user data
    const anonymousDocRef = window.doc(window.db, 'users', anonymousUid);
    const anonymousDocSnap = await window.getDoc(anonymousDocRef);
    
    if (anonymousDocSnap.exists()) {
      const anonymousData = anonymousDocSnap.data();
      
      // Update the data to mark as registered
      anonymousData.isRegistered = true;
      anonymousData.anonymousUid = anonymousUid; // Keep reference to previous ID
      
      // Set the data to the new user ID
      const registeredDocRef = window.doc(window.db, 'users', registeredUid);
      await window.setDoc(registeredDocRef, anonymousData);
      
      console.log("Data migration complete");
      
      // Optional: Delete the anonymous user data
      // await window.deleteDoc(anonymousDocRef);
      // console.log("Anonymous data deleted");
    }
  } catch (error) {
    console.error("Error migrating user data:", error);
    throw error;
  }
}

// Add a menu item to the user menu
document.addEventListener('DOMContentLoaded', function() {
  // Add "Change Username" item to user menu list
  const userMenuList = document.getElementById("userMenuList");
  if (userMenuList) {
    // Create new list item
    const changeUsernameItem = document.createElement("li");
    changeUsernameItem.id = "changeUsernameItem";
    changeUsernameItem.textContent = "Change Username";
    
    // Insert after the first item
    if (userMenuList.firstChild) {
      userMenuList.insertBefore(changeUsernameItem, userMenuList.firstChild.nextSibling);
    } else {
      userMenuList.appendChild(changeUsernameItem);
    }
    
    // Add click event
    changeUsernameItem.addEventListener("click", function() {
      showChangeUsernameModal();
    });
  }
  
  // Initialize modal handlers
  initChangeUsernameModal();
});

function showChangeUsernameModal() {
  if (!window.auth || !window.auth.currentUser) {
    alert("You must be logged in to change your username");
    return;
  }
  
  // Get current username
  const currentUsername = window.auth.currentUser.displayName || 
                        document.getElementById("usernameDisplay").textContent || 
                        "Unknown";
  
  // Update display and clear fields
  document.getElementById("currentUsernameDisplay").textContent = currentUsername;
  document.getElementById("newUsernameInput").value = "";
  document.getElementById("usernameChangeMessage").textContent = "";
  
  // Show modal
  document.getElementById("changeUsernameModal").style.display = "flex";
  
  // Close user menu
  closeUserMenu();
}

function initChangeUsernameModal() {
  // Close button handler
  document.getElementById("closeUsernameModal").addEventListener("click", function() {
    document.getElementById("changeUsernameModal").style.display = "none";
  });
  
  // Submit button handler goes here
  document.getElementById("submitUsernameChange").addEventListener("click", async function() {
    const newUsername = document.getElementById("newUsernameInput").value.trim();
    const messageElement = document.getElementById("usernameChangeMessage");
    
    // Validate username
    if (!newUsername) {
      messageElement.textContent = "Please enter a username";
      return;
    }
    
    if (newUsername.length < 3) {
      messageElement.textContent = "Username must be at least 3 characters";
      return;
    }
    
    if (newUsername.length > 20) {
      messageElement.textContent = "Username must be less than 20 characters";
      return;
    }
    
    try {
      // Update button state to show loading
      const submitButton = document.getElementById("submitUsernameChange");
      submitButton.textContent = "Saving...";
      submitButton.disabled = true;
      
      // Change username
      await changeUsername(newUsername);
      
      // Update UI username displays
      document.getElementById("usernameDisplay").textContent = newUsername;
      
      // Hide modal
      document.getElementById("changeUsernameModal").style.display = "none";
      
      // Show success message
      alert("Username updated successfully!");
      
      // Refresh leaderboard if visible
      if (document.getElementById("leaderboardView").style.display === "block") {
        if (typeof loadOverallData === 'function') {
          loadOverallData();
        }
      }
      
      // Update user menu if visible
      if (typeof updateUserMenu === 'function') {
        updateUserMenu();
      }
      
    } catch (error) {
      messageElement.textContent = "Error: " + error.message;
    } finally {
      // Reset button state
      submitButton.textContent = "Save New Username";
      submitButton.disabled = false;
    }
  });
}

// Function to update username
async function changeUsername(newUsername) {
  if (!window.auth || !window.auth.currentUser) {
    throw new Error("User not authenticated");
  }
  
  // Validate username
  if (!newUsername || newUsername.length < 3 || newUsername.length > 20) {
    throw new Error("Username must be between 3 and 20 characters");
  }
  
  try {
    const uid = window.auth.currentUser.uid;
    
    // Update Auth profile (display name)
    await window.updateProfile(window.auth.currentUser, {
      displayName: newUsername
    });
    
    // Update Firestore user document using setDoc with merge option
    const userDocRef = window.doc(window.db, 'users', uid);
    await window.setDoc(userDocRef, {
      username: newUsername
    }, { merge: true });
    
    console.log("Username updated successfully to:", newUsername);
    return true;
  } catch (error) {
    console.error("Error updating username:", error);
    throw error;
  }
}

// Handle Google Sign-In
document.getElementById('googleAuthBtn').addEventListener('click', async function() {
  try {
    // Create Google provider instance
    const provider = new window.GoogleAuthProvider();
    
    // Sign in with popup
    const result = await window.signInWithPopup(window.auth, provider);
    
    // Get user details
    const user = result.user;
    const isNewUser = result._tokenResponse.isNewUser;
    
    // Check if this is a new user
    if (isNewUser) {
      // Go to profile completion
      showProfileCompletion(user);
    } else {
      // Existing user - check if they have training level
      const userDocRef = window.doc(window.db, 'users', user.uid);
      const userDoc = await window.getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().trainingLevel) {
        // User has completed profile, go to main screen
        document.getElementById('signupScreen').style.display = 'none';
        document.getElementById('mainOptions').style.display = 'flex';
        updateUserMenu();
      } else {
        // User needs to complete profile
        showProfileCompletion(user);
      }
    }
  } catch (error) {
    console.error("Google sign-in error:", error);
    alert("Error signing in with Google: " + error.message);
  }
});

// Handle Apple Sign-In
document.getElementById('appleAuthBtn').addEventListener('click', async function() {
  try {
    // Create Apple provider instance
    const provider = new window.OAuthProvider('apple.com');
    
    // Sign in with popup
    const result = await window.signInWithPopup(window.auth, provider);
    
    // Get user details
    const user = result.user;
    const isNewUser = result._tokenResponse.isNewUser;
    
    // Check if this is a new user
    if (isNewUser) {
      // Go to profile completion
      showProfileCompletion(user);
    } else {
      // Existing user - check if they have training level
      const userDocRef = window.doc(window.db, 'users', user.uid);
      const userDoc = await window.getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().trainingLevel) {
        // User has completed profile, go to main screen
        document.getElementById('signupScreen').style.display = 'none';
        document.getElementById('mainOptions').style.display = 'flex';
        updateUserMenu();
      } else {
        // User needs to complete profile
        showProfileCompletion(user);
      }
    }
  } catch (error) {
    console.error("Apple sign-in error:", error);
    alert("Error signing in with Apple: " + error.message);
  }
});

// Profile Completion Screen
function showProfileCompletion(user) {
  // Hide the welcome and signup screens
  document.getElementById('welcomeScreen').style.display = 'none';
  
  // Create a modal for profile completion
  let profileModal = document.getElementById('profileCompletionModal');
  
  // If the modal doesn't exist, create it
  if (!profileModal) {
    profileModal = document.createElement('div');
    profileModal.id = 'profileCompletionModal';
    profileModal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;';
    
    profileModal.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; width: 90%; max-width: 400px;">
        <h2 style="text-align: center; color: #0056b3;">Complete Your Profile</h2>
        <p>Just a few more details to get started:</p>
        
        <div style="margin-bottom: 15px;">
          <label for="profileUsername" style="display: block; margin-bottom: 5px;">Username</label>
          <input type="text" id="profileUsername" placeholder="Choose a username" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
          <p id="profileUsernameMessage" style="color: red; font-size: 0.8rem; min-height: 1rem;"></p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label for="profileTrainingLevel" style="display: block; margin-bottom: 5px;">Training Level</label>
          <select id="profileTrainingLevel" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
            <option value="" disabled selected>Select Your Training Level</option>
            <option value="Medical Student">Medical Student</option>
            <option value="PGY 1-2">PGY 1-2</option>
            <option value="PGY 3-4">PGY 3-4</option>
            <option value="PGY 5+">PGY 5+</option>
            <option value="Attending">Attending</option>
            <option value="Other">Other</option>
          </select>
          <p id="profileTrainingMessage" style="color: red; font-size: 0.8rem; min-height: 1rem;"></p>
        </div>
        
        <button id="saveProfileBtn" style="width: 100%; padding: 10px; background: linear-gradient(135deg, #0C72D3 0%, #66a6ff 100%); color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;">Save Profile</button>
      </div>
    `;
    
    document.body.appendChild(profileModal);
    
    // Add event listener for the save button
    document.getElementById('saveProfileBtn').addEventListener('click', async function() {
      const username = document.getElementById('profileUsername').value.trim();
      const trainingLevel = document.getElementById('profileTrainingLevel').value;
      
      // Reset error messages
      document.getElementById('profileUsernameMessage').textContent = '';
      document.getElementById('profileTrainingMessage').textContent = '';
      
      // Validate inputs
      let isValid = true;
      
      if (!username || username.length < 3) {
        document.getElementById('profileUsernameMessage').textContent = 'Username must be at least 3 characters';
        isValid = false;
      }
      
      if (!trainingLevel) {
        document.getElementById('profileTrainingMessage').textContent = 'Please select your training level';
        isValid = false;
      }
      
      if (!isValid) return;
      
      try {
        // Show loading state
        const saveBtn = document.getElementById('saveProfileBtn');
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        // Update Auth profile
        await window.updateProfile(user, {
          displayName: username
        });
        
        // Update or create user document
        const userDocRef = window.doc(window.db, 'users', user.uid);
        await window.setDoc(userDocRef, {
          username: username,
          trainingLevel: trainingLevel,
          email: user.email,
          isRegistered: true,
          createdAt: window.serverTimestamp(),
          stats: { 
            totalAnswered: 0, 
            totalCorrect: 0, 
            totalIncorrect: 0, 
            categories: {}, 
            totalTimeSpent: 0,
            xp: 0,
            level: 1
          },
          streaks: { 
            lastAnsweredDate: null, 
            currentStreak: 0, 
            longestStreak: 0 
          }
        }, { merge: true });
        
        // Hide modal and show main screen
        profileModal.style.display = 'none';
        document.getElementById('mainOptions').style.display = 'flex';
        
        // Update UI
        updateUserMenu();
        
      } catch (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile: ' + error.message);
        
        // Reset button
        saveBtn.textContent = 'Save Profile';
        saveBtn.disabled = false;
      }
    });
  } else {
    // Clear previous values
    document.getElementById('profileUsername').value = '';
    document.getElementById('profileTrainingLevel').value = '';
    document.getElementById('profileUsernameMessage').textContent = '';
    document.getElementById('profileTrainingMessage').textContent = '';
    
    // Set initial username if available
    if (user.displayName) {
      document.getElementById('profileUsername').value = user.displayName;
    }
    
    // Show the modal
    profileModal.style.display = 'flex';
  }
}

// Update the validateSignup function to include training level validation
function validateSignup() {
  const username = document.getElementById('usernameInput').value.trim();
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const trainingLevel = document.getElementById('trainingLevelSelect').value;
  
  let isValid = true;
  
  // Validate username
  if (username.length < 3) {
    document.getElementById('usernameMessage').textContent = 'Username must be at least 3 characters';
    document.getElementById('usernameMessage').className = 'input-message error';
    isValid = false;
  }
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    document.getElementById('emailMessage').textContent = 'Please enter a valid email address';
    document.getElementById('emailMessage').className = 'input-message error';
    isValid = false;
  }
  
  // Validate password
  if (password.length < 6) {
    document.getElementById('passwordMessage').textContent = 'Password must be at least 6 characters';
    document.getElementById('passwordMessage').className = 'input-message error';
    isValid = false;
  }
  
  // Validate training level
  if (!trainingLevel) {
    document.getElementById('trainingLevelMessage').textContent = 'Please select your training level';
    document.getElementById('trainingLevelMessage').className = 'input-message error';
    isValid = false;
  }
  
  return isValid;
}

// Set toolbar to preview mode (only logo, not clickable)
function setToolbarToPreviewMode() {
  const toolbar = document.querySelector(".toolbar");
  if (toolbar) {
    toolbar.classList.add("preview-mode");
  }
}

// Restore toolbar to normal mode (with menu buttons)
function restoreToolbarToNormalMode() {
  const toolbar = document.querySelector(".toolbar");
  if (toolbar) {
    toolbar.classList.remove("preview-mode");
  }
}
