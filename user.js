// Session tracking
let questionStartTime = 0; // This might be better in quiz.js if only used there
let sessionStartTime = Date.now(); // Seems unused, consider removing

// Fetch already answered questions from Firestore
async function fetchPersistentAnsweredIds() {
  if (!window.auth || !window.auth.currentUser) {
    console.log("fetchPersistentAnsweredIds: User not authenticated yet");
    return []; // Return empty for guest or unauthenticated
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    if (userDocSnap.exists()){
      let data = userDocSnap.data();
      // Ensure answeredQuestions exists and is an object
      if (data.answeredQuestions && typeof data.answeredQuestions === 'object') {
           return Object.keys(data.answeredQuestions);
      }
    }
  } catch (error) {
    console.error("Error fetching answered IDs:", error);
  }
  return [];
}
window.fetchPersistentAnsweredIds = fetchPersistentAnsweredIds; // Make globally available

// Record answer in Firestore with XP calculation
async function recordAnswer(questionId, category, isCorrect, timeSpent) {
  if (!window.auth || !window.auth.currentUser) {
    console.log("User not authenticated, can't record answer");
    // Potentially track guest answers locally if needed later, but not saving to DB
    return;
  }

  const uid = window.auth.currentUser.uid;
  const userDocRef = window.doc(window.db, 'users', uid);

  try {
    let levelUp = false;
    let newLevel = 0;
    let totalXP = 0;
    let lastBonusMessages = null; // To capture bonus messages

    await window.runTransaction(window.db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef); // Use transaction.get inside transaction
      let data = userDoc.exists() ? userDoc.data() : {};

      // Initialize stats if needed
      if (!data.stats) {
        data.stats = {
          totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0,
          categories: {}, totalTimeSpent: 0, xp: 0, level: 1,
          achievements: {}, currentCorrectStreak: 0
        };
      }
      // Ensure nested objects/values exist
      data.stats.xp = data.stats.xp || 0;
      data.stats.level = data.stats.level || 1;
      data.stats.achievements = data.stats.achievements || {};
      data.stats.currentCorrectStreak = data.stats.currentCorrectStreak || 0;
      data.stats.categories = data.stats.categories || {};
      data.stats.totalTimeSpent = data.stats.totalTimeSpent || 0;

      if (!data.answeredQuestions) {
        data.answeredQuestions = {};
      }
      // Avoid double-recording (though ideally this check happens before calling recordAnswer)
      // if (data.answeredQuestions[questionId]) return; // Commenting out - let quiz logic handle first answer

      // Track consecutive correct answers
      data.stats.currentCorrectStreak = isCorrect ? (data.stats.currentCorrectStreak + 1) : 0;

      const currentDate = new Date();
      const currentTimestamp = currentDate.getTime(); // Use Firestore serverTimestamp later if possible
      const currentFormatted = currentDate.toLocaleString(); // For human readability if needed

      // Store answer details (consider if timestampFormatted is needed)
      data.answeredQuestions[questionId] = {
        isCorrect,
        category,
        timestamp: currentTimestamp, // Consider using serverTimestamp() for consistency
        // timestampFormatted: currentFormatted, // Optional
        timeSpent
      };

      // Update basic stats
      data.stats.totalAnswered++;
      if (isCorrect) {
        data.stats.totalCorrect++;
      } else {
        data.stats.totalIncorrect++;
      }
      data.stats.totalTimeSpent += timeSpent;

      // Update category stats
      if (!data.stats.categories[category]) {
        data.stats.categories[category] = { answered: 0, correct: 0, incorrect: 0 };
      }
      data.stats.categories[category].answered++;
      if (isCorrect) {
        data.stats.categories[category].correct++;
      } else {
        data.stats.categories[category].incorrect++;
      }

      // --- XP Calculation ---
      let earnedXP = 1; // Base XP
      let bonusXP = 0;
      let bonusMessages = [];

      if (isCorrect) {
        earnedXP += 2; // Correct answer bonus
      }

      // Streaks Update
      const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
      let streaks = data.streaks || { lastAnsweredDate: null, currentStreak: 0, longestStreak: 0 };
      let streakUpdated = false;
      const normalizedCurrent = normalizeDate(currentDate);

      if (streaks.lastAnsweredDate) {
        const lastDate = new Date(streaks.lastAnsweredDate);
        const normalizedLast = normalizeDate(lastDate);
        const diffDays = Math.round((normalizedCurrent - normalizedLast) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streaks.currentStreak += 1;
          streakUpdated = true;
        } else if (diffDays > 1) {
          streaks.currentStreak = 1; // Reset streak
          streakUpdated = true; // Counts as day 1
        } else if (diffDays === 0) {
          // Same day, don't update streak count but update lastAnsweredDate
        } else {
             streaks.currentStreak = 1; // Fallback for unexpected date diffs
             streakUpdated = true;
        }
        streaks.lastAnsweredDate = currentDate.toISOString(); // Always update last answered
      } else {
        // First answer ever for streaks
        streaks.lastAnsweredDate = currentDate.toISOString();
        streaks.currentStreak = 1;
        streakUpdated = true;
      }

      if (streaks.currentStreak > (streaks.longestStreak || 0)) {
        streaks.longestStreak = streaks.currentStreak;
      }
      data.streaks = streaks;

      // --- Bonus XP Calculations ---
      // (Keep existing achievement and streak bonus logic)
        // First 10 questions answered bonus (one-time)
      if (data.stats.totalAnswered === 10 && !data.stats.achievements.first10Questions) {
        bonusXP += 50; bonusMessages.push("First 10 questions: +50 XP");
        data.stats.achievements.first10Questions = true;
      }
       // Using the app for 7 days straight (one-time)
      if (streaks.currentStreak === 7 && !data.stats.achievements.first7DayStreak) {
        bonusXP += 50; bonusMessages.push("7-day streak achieved: +50 XP");
        data.stats.achievements.first7DayStreak = true;
      }
      // First 5 correct in a row (one-time)
      if (data.stats.currentCorrectStreak === 5 && !data.stats.achievements.first5Correct) {
        bonusXP += 20; bonusMessages.push("First 5 correct row: +20 XP");
        data.stats.achievements.first5Correct = true;
      }
       // Current day streak bonuses (only if streak incremented or started)
      if (streakUpdated) {
          const streakMilestones = { 3: 5, 7: 15, 14: 30, 30: 75, 60: 150, 100: 500 };
          if (streakMilestones[streaks.currentStreak]) {
              bonusXP += streakMilestones[streaks.currentStreak];
              bonusMessages.push(`${streaks.currentStreak}-day streak: +${streakMilestones[streaks.currentStreak]} XP`);
          }
      }
      // Correct answer count milestones (run every time)
      const correctMilestones = { 10: 10, 25: 25, 50: 75, 100: 150, 200: 300 }; // Added more
      if (isCorrect && correctMilestones[data.stats.totalCorrect]) {
          // Check if this specific milestone was already awarded to prevent double bonuses if totalCorrect doesn't change between calls
          const milestoneKey = `correct${data.stats.totalCorrect}`;
          if (!data.stats.achievements[milestoneKey]) {
              bonusXP += correctMilestones[data.stats.totalCorrect];
              bonusMessages.push(`${data.stats.totalCorrect} correct answers: +${correctMilestones[data.stats.totalCorrect]} XP`);
              data.stats.achievements[milestoneKey] = true;
          }
      }
      // Consecutive correct answer bonuses (run every time)
       const consecutiveMilestones = { 5: 10, 10: 25, 20: 75 };
       if (consecutiveMilestones[data.stats.currentCorrectStreak]) {
           bonusXP += consecutiveMilestones[data.stats.currentCorrectStreak];
           bonusMessages.push(`${data.stats.currentCorrectStreak} correct in a row: +${consecutiveMilestones[data.stats.currentCorrectStreak]} XP`);
       }

      // --- Final XP Update & Level Check ---
      const totalEarnedXP = earnedXP + bonusXP;
      data.stats.xp += totalEarnedXP;
      totalXP = data.stats.xp; // Capture final total XP

      if (bonusMessages.length > 0) {
        // Store messages to be displayed later by updateUserXP
        lastBonusMessages = bonusMessages;
        // Optional: Persist last messages if needed, or handle display immediately
        // data.stats.lastBonusMessages = bonusMessages; // If persisting
      }

      const oldLevel = data.stats.level;
      newLevel = calculateLevel(data.stats.xp); // Use calculateLevel function
      data.stats.level = newLevel;

      if (newLevel > oldLevel) {
        levelUp = true;
      }

      // Set data in transaction
      transaction.set(userDocRef, data, { merge: true }); // Use merge:true to avoid overwriting fields unintentionally
    }); // End Firestore Transaction

    console.log(`Recorded answer for ${questionId}. XP Earned: ${earnedXP + bonusXP}. Total XP: ${totalXP}`);

    // Update UI elements immediately after transaction
    if (typeof updateUserXP === 'function') {
      updateUserXP(); // Update score circle, XP display etc.
    }
    if (typeof updateUserMenu === 'function') {
        updateUserMenu(); // Update user menu details
    }
     // Update the dashboard display
    if (typeof initializeDashboard === 'function') {
      initializeDashboard();
    }

    // Show bonus messages if any were generated
    if (lastBonusMessages && lastBonusMessages.length > 0) {
        showBonusMessages(lastBonusMessages);
    }

    // Show level-up animation if level increased
    if (levelUp) {
      setTimeout(() => { // Delay slightly for effect
         if (typeof showLevelUpAnimation === 'function') {
            showLevelUpAnimation(newLevel, totalXP);
         }
      }, 500); // Short delay after answer feedback
    }

  } catch (error) {
    console.error("Error recording answer:", error);
  }
}
window.recordAnswer = recordAnswer; // Make globally available

// Calculate level based on XP thresholds
function calculateLevel(xp) {
  // Ensure thresholds are defined correctly
   const levelThresholds = [0, 30, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000, 2750, 3750, 5000, 6500]; // XP required to *reach* level index+1
   let level = 1;
   // Iterate backwards for efficiency
   for (let i = levelThresholds.length - 1; i > 0; i--) {
       if (xp >= levelThresholds[i]) {
           level = i + 1;
           break;
       }
   }
   return level;
}
window.calculateLevel = calculateLevel; // Make globally available

// Calculate progress to next level (as percentage)
function calculateLevelProgress(xp) {
   const levelThresholds = [0, 30, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000, 2750, 3750, 5000, 6500];
   const level = calculateLevel(xp); // Use the calculateLevel function

   if (level >= levelThresholds.length) {
       return 100; // Max level
   }

   const currentLevelXpStart = levelThresholds[level - 1];
   const nextLevelXpStart = levelThresholds[level];
   const xpNeededForLevel = nextLevelXpStart - currentLevelXpStart;
   const xpEarnedInLevel = xp - currentLevelXpStart;

   if (xpNeededForLevel <= 0) return 100; // Avoid division by zero if thresholds are bad

   return Math.min(100, Math.floor((xpEarnedInLevel / xpNeededForLevel) * 100));
}
window.calculateLevelProgress = calculateLevelProgress; // Make globally available

// XP info for a specific level
function getLevelInfo(level) {
   const levelThresholds = [0, 30, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000, 2750, 3750, 5000, 6500];
   const actualLevel = Math.min(level, levelThresholds.length); // Cap at max defined level
   const currentLevelXp = levelThresholds[actualLevel - 1];
   let nextLevelXp = null;
   if (actualLevel < levelThresholds.length) {
       nextLevelXp = levelThresholds[actualLevel];
   }
   return { currentLevelXp, nextLevelXp };
}
window.getLevelInfo = getLevelInfo; // Make globally available

// Update question stats in Firestore (GLOBAL stats, not user-specific)
async function updateQuestionStats(questionId, isCorrect) {
  if (!window.db) {
    console.log("Database not initialized for updateQuestionStats");
    return;
  }
  // Ensure questionId is a valid string for Firestore path
  if (!questionId || typeof questionId !== 'string' || questionId.includes('/') || questionId.includes('.')) {
      console.error("Invalid questionId for Firestore path:", questionId);
      return;
  }

  console.log("updateQuestionStats called for:", questionId, "isCorrect:", isCorrect);
  const questionStatsRef = window.doc(window.db, "questionStats", questionId); // Use the valid questionId
  try {
    await window.runTransaction(window.db, async (transaction) => {
      const statsDoc = await transaction.get(questionStatsRef);
      let statsData = statsDoc.exists() ? statsDoc.data() : { totalAttempts: 0, correctAttempts: 0 };
      statsData.totalAttempts = (statsData.totalAttempts || 0) + 1;
      if (isCorrect) {
        statsData.correctAttempts = (statsData.correctAttempts || 0) + 1;
      }
      transaction.set(questionStatsRef, statsData, { merge: true }); // Use merge true to be safe
    });
    console.log("Updated global stats for question", questionId);
  } catch (error) {
    console.error("Error updating global question stats:", error);
  }
}
window.updateQuestionStats = updateQuestionStats; // Make globally available

// Update user XP display in UI elements
async function updateUserXP() {
  // Add check: Only run if user is logged in
  if (!window.auth || !window.auth.currentUser) {
    // Clear guest UI elements if needed, or just return
    // Example: Set default guest values
    const scoreCircle = document.getElementById("scoreCircle");
    if (scoreCircle) scoreCircle.textContent = "?"; // Or hide it
    const xpDisplay = document.getElementById("xpDisplay");
    if (xpDisplay) xpDisplay.textContent = ""; // Or "Guest Mode"
     if (typeof updateLevelProgress === 'function') {
        updateLevelProgress(0); // Reset progress visuals
    }
    console.log("updateUserXP: No logged-in user.");
    return;
  }

   // Proceed for logged-in user
  if (!window.db) {
      console.log("DB not initialized for updateUserXP");
      return;
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const stats = data.stats || { xp: 0, level: 1 }; // Provide defaults
      const xp = stats.xp || 0;
      const level = stats.level || 1;
      const progress = calculateLevelProgress(xp); // Use global function

      // Update level display (Top toolbar)
      const scoreCircle = document.getElementById("scoreCircle");
      if (scoreCircle) {
        scoreCircle.textContent = level;
      }

      // Update XP display (Top toolbar)
      const xpDisplay = document.getElementById("xpDisplay");
      if (xpDisplay) {
        xpDisplay.textContent = `${xp} XP`;
      }

      // Update user menu level display
      const userScoreCircle = document.getElementById("userScoreCircle");
      if (userScoreCircle) {
        userScoreCircle.textContent = level;
      }

      // Update user menu XP display (with progress to next level)
      const userXpDisplay = document.getElementById("userXpDisplay");
      if (userXpDisplay) {
        const levelInfo = getLevelInfo(level); // Use global function
        if (levelInfo.nextLevelXp) {
          userXpDisplay.textContent = `${xp}/${levelInfo.nextLevelXp} XP`;
        } else {
          userXpDisplay.textContent = `${xp} XP (Max Level)`;
        }
      }

      // Update progress bars and circles
      if (typeof updateLevelProgress === 'function') {
        updateLevelProgress(progress);
      } else {
          console.warn("updateLevelProgress function not found");
      }

      // Dashboard update is handled by initializeDashboard called after recordAnswer
      // No need to call it here again unless needed for standalone XP updates.

      // --- Bonus Message Handling ---
      // Check for bonus messages stored temporarily after recordAnswer
      // This part was slightly flawed, let's refine how bonuses are shown.
      // The showBonusMessages function will be called directly after recordAnswer if bonuses exist.
      // We don't need to check the DB again here for lastBonusMessages unless recordAnswer didn't handle it.

    } else {
         console.log("updateUserXP: User doc doesn't exist for UID:", uid);
         // Handle case where user doc might be missing after auth
          const scoreCircle = document.getElementById("scoreCircle");
          if (scoreCircle) scoreCircle.textContent = "?";
          const xpDisplay = document.getElementById("xpDisplay");
          if (xpDisplay) xpDisplay.textContent = "Error";
           if (typeof updateLevelProgress === 'function') updateLevelProgress(0);
    }
  } catch (error) {
    console.error("Error updating user XP:", error);
  }
}
window.updateUserXP = updateUserXP; // Make globally available

// Show bonus messages as notifications
function showBonusMessages(messages) {
  if (!messages || messages.length === 0) return;

  let notificationContainer = document.getElementById("xpNotifications");
  if (!notificationContainer) {
      notificationContainer = document.createElement("div");
      notificationContainer.id = "xpNotifications";
      // --- Styling for the container ---
      notificationContainer.style.position = "fixed";
      notificationContainer.style.top = "70px"; // Below top bar
      notificationContainer.style.right = "20px";
      notificationContainer.style.zIndex = "9999";
      notificationContainer.style.width = "auto";
      notificationContainer.style.maxWidth = "300px";
      document.body.appendChild(notificationContainer);
  }

  // Create and show notifications for each message
  messages.forEach((message, index) => {
    const notification = document.createElement("div");
    notification.className = "xp-notification"; // Use class for CSS styling if preferred
    // --- Styling for individual notification ---
    notification.style.backgroundColor = "#0056b3"; // Dark blue
    notification.style.color = "white";
    notification.style.padding = "10px 15px";
    notification.style.borderRadius = "6px";
    notification.style.marginBottom = "10px";
    notification.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    notification.style.display = "flex";
    notification.style.alignItems = "center";
    notification.style.opacity = "0";
    notification.style.transform = "translateX(50px)"; // Start off-screen right
    notification.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    notification.innerHTML = `<div class="xp-icon" style="margin-right: 10px; font-size: 1.3rem;">✨</div> ${message}`;

    notificationContainer.appendChild(notification);

    // Animate in with slight delay per item
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateX(0)";
    }, 100 * index);

    // Remove after a longer delay
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(50px)";
      // Remove element after fade out transition
      setTimeout(() => notification.remove(), 500);
    }, 4000 + 200 * index); // Stay longer, stagger removal
  });

  // Optional: Clear the container after all notifications are gone
  // (May not be needed if individual notifications remove themselves reliably)
  // setTimeout(() => {
  //    if (notificationContainer && notificationContainer.children.length === 0) {
  //       notificationContainer.remove();
  //    }
  // }, 4000 + 200 * messages.length + 500);
}
// No need to make showBonusMessages global if only called internally by recordAnswer

// Update the user menu with current username and score/level
async function updateUserMenu() {
  // Only run if user is logged in
  if (!window.auth || !window.auth.currentUser) {
    // Clear user-specific info in the menu for guests
    const usernameDisplay = document.getElementById("usernameDisplay");
    if (usernameDisplay) usernameDisplay.textContent = "Guest"; // Indicate guest status
    const userScoreCircle = document.getElementById("userScoreCircle");
    if (userScoreCircle) userScoreCircle.textContent = "?"; // Or hide
    const userXpDisplay = document.getElementById("userXpDisplay");
    if (userXpDisplay) userXpDisplay.textContent = ""; // Clear XP
    const userLevelProgress = document.getElementById("userLevelProgress");
     if (userLevelProgress) userLevelProgress.style.setProperty('--progress', `0%`);
     const levelProgressBar = document.getElementById("levelProgressBar");
     if (levelProgressBar) levelProgressBar.style.width = `0%`;
    console.log("updateUserMenu: No logged-in user.");
    return;
  }

   // Proceed for logged-in user
  if (!window.db) {
      console.log("DB not initialized for updateUserMenu");
      return;
  }

  try {
    const username = await getOrGenerateUsername(); // Use global function
    const usernameDisplay = document.getElementById("usernameDisplay");
    if (usernameDisplay) {
      usernameDisplay.textContent = username;
    }

    // Update XP/Level display within the menu relies on updateUserXP,
    // which is already called after recordAnswer. Calling it again here might be redundant,
    // unless this function is called independently sometimes. Let's call it just in case.
    await updateUserXP(); // Ensure menu XP/Level details are current

  } catch (error) {
    console.error("Error updating user menu:", error);
  }
}
window.updateUserMenu = updateUserMenu; // Make globally available

// Get or generate a username
async function getOrGenerateUsername() {
  if (!window.auth || !window.auth.currentUser) {
    // Should not happen if called correctly, but handle defensively
    console.error("getOrGenerateUsername called without logged-in user.");
    return "Guest"; // Return Guest if no user
  }
   if (!window.db) {
      console.error("DB not ready for getOrGenerateUsername");
      return "Guest";
  }

  const uid = window.auth.currentUser.uid;
  const userDocRef = window.doc(window.db, 'users', uid);

  try {
      const userDocSnap = await window.getDoc(userDocRef);
      let username;

      if (userDocSnap.exists() && userDocSnap.data().username) {
          username = userDocSnap.data().username;
      } else {
          username = generateRandomName(); // Use helper function
          // Use a transaction to set the username safely if doc exists but username doesn't
          await window.runTransaction(window.db, async (transaction) => {
              const freshDoc = await transaction.get(userDocRef); // Get fresh doc inside transaction
              let data = freshDoc.exists() ? freshDoc.data() : {};
              if (!data.username) { // Only set if it's truly missing
                  data.username = username;
                  // If doc didn't exist, transaction.set creates it. If it existed, it merges.
                  transaction.set(userDocRef, data, { merge: true });
              }
          });
          console.log("Generated and saved new username:", username);
      }
      return username;
  } catch (error) {
      console.error("Error getting or generating username:", error);
      return "User"; // Fallback username on error
  }
}
window.getOrGenerateUsername = getOrGenerateUsername; // Make globally available

// Generate a random username helper function
function generateRandomName() {
  const adjectives = ["Aural", "Otologic", "Laryngo", "Rhino", "Acoustic", "Vocal", "Expert", "Master", "Skillful", "Quick", "Sharp", "Bright"];
  const nouns = ["Cochlea", "Tympanum", "Glottis", "Sinus", "Auricle", "Eustachian", "Scalpel", "Endoscope", "Needle", "Probe", "Laser"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9000) + 1000; // 4-digit number
  return `${adj}${noun}${num}`;
}
// generateRandomName is internal, no need to make global

// Get user's bookmarks
async function getBookmarks() {
  // Add check: Return empty array for guests
  if (!window.auth || !window.auth.currentUser) {
    console.log("getBookmarks: No logged-in user.");
    return [];
  }
   if (!window.db) {
      console.log("DB not ready for getBookmarks");
      return [];
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    if (userDocSnap.exists()){
      const data = userDocSnap.data();
      return data.bookmarks || []; // Return bookmarks array or empty array if field doesn't exist
    }
  } catch (error) {
    console.error("Error getting bookmarks:", error);
  }
  return []; // Return empty array on error or if doc doesn't exist
}
window.getBookmarks = getBookmarks; // Make globally available

// Toggle a bookmark (add if not present, remove if present)
async function toggleBookmark(questionId) {
   // Add check: Prevent guests from bookmarking
  if (!window.auth || !window.auth.currentUser) {
    console.log("toggleBookmark: No logged-in user.");
    // Optionally show a signup prompt here later
    alert("Please sign up to save bookmarks!");
    return false; // Indicate bookmark was not toggled
  }
   if (!window.db) {
      console.log("DB not ready for toggleBookmark");
      return false;
  }
   if (!questionId) {
       console.error("toggleBookmark: Invalid questionId provided.");
       return false;
   }


  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    let isBookmarkedAfterToggle = false; // To track the final state

    await window.runTransaction(window.db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      let data = userDoc.exists() ? userDoc.data() : {};
      let bookmarks = data.bookmarks || [];

      const index = bookmarks.indexOf(questionId);

      if (index === -1) {
        // Not bookmarked -> Add it
        bookmarks.push(questionId);
        isBookmarkedAfterToggle = true;
      } else {
        // Already bookmarked -> Remove it
        bookmarks.splice(index, 1);
        isBookmarkedAfterToggle = false;
      }

      // Update the document in the transaction
      transaction.set(userDocRef, { bookmarks: bookmarks }, { merge: true });
    });

    // Update the current slide's bookmark attribute (visual feedback)
    const currentSlide = document.querySelector(`.swiper-slide[data-id="${questionId}"]`);
    if (currentSlide) {
      currentSlide.dataset.bookmarked = isBookmarkedAfterToggle ? "true" : "false";
    }

    return isBookmarkedAfterToggle; // Return the new state

  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return false; // Return false on error
  }
}
window.toggleBookmark = toggleBookmark; // Make globally available

// Function to show the level-up modal and animation
function showLevelUpAnimation(newLevel, totalXP) {
  // Ensure modal exists (or create it)
  let modal = document.getElementById('levelUpModal');
  if (!modal) {
      modal = document.createElement('div');
      modal.id = 'levelUpModal';
      // Using template literal for cleaner HTML structure
      modal.innerHTML = `
          <div id="levelUpContent">
              <div id="levelUpHeader">
                  <h2 id="levelUpTitle">LEVEL UP!</h2>
              </div>
              <div id="levelUpBadge">
                  <span id="levelNumber">${newLevel}</span>
              </div>
              <div id="levelUpBody">
                  <p id="levelUpMessage">Congratulations! You've reached Level ${newLevel}!</p>
                  <p id="levelUpXP">Total XP: ${totalXP}</p>
                  <button id="levelUpButton">Continue</button>
              </div>
          </div>
      `;
      document.body.appendChild(modal);

      // Add event listener to close button *once* when modal is created
      const levelUpButton = document.getElementById('levelUpButton');
      if (levelUpButton) {
          levelUpButton.addEventListener('click', hideLevelUpModal); // Use named function
      }
  } else {
      // If modal already exists, just update content
      const levelNumberEl = document.getElementById('levelNumber');
      const levelUpXPEl = document.getElementById('levelUpXP');
      const levelUpMessageEl = document.getElementById('levelUpMessage');

      if (levelNumberEl) levelNumberEl.textContent = newLevel;
      if (levelUpXPEl) levelUpXPEl.textContent = `Total XP: ${totalXP}`;
       if (levelUpMessageEl) {
            // Add more varied messages
            const messages = [
                `Congratulations! You've reached Level ${newLevel}!`,
                `Awesome! Welcome to Level ${newLevel}!`,
                `Level ${newLevel} unlocked! Keep learning!`
            ];
            levelUpMessageEl.textContent = messages[Math.floor(Math.random() * messages.length)];
        }
  }

  // Show the modal with animation
  modal.style.display = 'flex'; // Use flex for centering
  // Force reflow before adding class for transition
  void modal.offsetWidth;
  modal.classList.add('show'); // Add class to trigger CSS opacity transition

  createConfetti(); // Trigger confetti effect

  // Play sound effect (ensure path is correct or use a reliable source)
   try {
        // Example using a free sound effect URL - replace with your own if needed
        const levelUpSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_c2a9536149.mp3?filename=level-up-arcade-6445.mp3');
        levelUpSound.volume = 0.4; // Adjust volume
        levelUpSound.play().catch(e => console.log("Audio play failed:", e)); // Catch potential errors
    } catch (e) {
        console.log("Could not initialize or play level up sound:", e);
    }
}
window.showLevelUpAnimation = showLevelUpAnimation; // Make globally available

// Function to hide the level-up modal
function hideLevelUpModal() {
  const modal = document.getElementById('levelUpModal');
  if (modal) {
    modal.classList.remove('show'); // Trigger fade out
    // Wait for animation to finish before hiding
    setTimeout(() => {
      modal.style.display = 'none';
      // Remove confetti elements after modal is hidden
      const confettiElements = modal.querySelectorAll('.confetti');
      confettiElements.forEach(c => c.remove());
    }, 300); // Match CSS transition duration
  }
}
// No need to make hideLevelUpModal global if only called by button listener

// Function to create confetti effect
function createConfetti() {
  const colors = ['#FFC700', '#FF3D00', '#00C853', '#2979FF', '#AA00FF', '#D500F9'];
  const modalContent = document.getElementById('levelUpContent'); // Target content area
  if (!modalContent) return;

  // Remove old confetti first
  const oldConfetti = modalContent.querySelectorAll('.confetti');
  oldConfetti.forEach(c => c.remove());

  const confettiCount = 50; // Number of confetti pieces
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti'; // Use class for styling via CSS
    // Position randomly within the modal content boundaries
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.top = -10 + 'px'; // Start slightly above the view
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    // Random size
    const size = 6 + Math.random() * 6;
    confetti.style.width = `${size}px`;
    confetti.style.height = `${size}px`;
    // Random animation delay and duration
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.animationDuration = 1 + Math.random() * 1 + 's';

    modalContent.appendChild(confetti);
  }
}
// No need to make createConfetti global

// Function to update spaced repetition data for a question
async function updateSpacedRepetitionData(questionId, isCorrect, difficulty, nextReviewInterval) {
  // Add guest check
  if (!window.auth || !window.auth.currentUser) {
    console.log("updateSpacedRepetitionData: No logged-in user.");
    return;
  }
   if (!window.db) {
      console.log("DB not ready for updateSpacedRepetitionData");
      return;
  }
   if (!questionId || !difficulty || typeof nextReviewInterval !== 'number') {
       console.error("Invalid parameters for updateSpacedRepetitionData");
       return;
   }

  const uid = window.auth.currentUser.uid;
  const userDocRef = window.doc(window.db, 'users', uid);

  try {
    await window.runTransaction(window.db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      let data = userDoc.exists() ? userDoc.data() : {};

      if (!data.spacedRepetition) {
        data.spacedRepetition = {};
      }

      const now = new Date();
      const nextReviewDate = new Date();
      // Ensure interval is at least 1 day
      const validInterval = Math.max(1, nextReviewInterval);
      nextReviewDate.setDate(now.getDate() + validInterval);
      // Set time to start of day for consistency
      nextReviewDate.setHours(0, 0, 0, 0);

      // Get previous data to calculate new interval based on SM-2 logic (optional enhancement)
      const previousData = data.spacedRepetition[questionId] || {};
      const reviewCount = (previousData.reviewCount || 0) + 1;

      // Simple update for now, replace with SM-2 later if needed
      data.spacedRepetition[questionId] = {
        lastReviewedAt: now.toISOString(),
        nextReviewDate: nextReviewDate.toISOString(), // Store as ISO string
        reviewInterval: validInterval,
        difficulty: difficulty, // 'easy', 'medium', 'hard'
        lastResult: isCorrect ? 'correct' : 'incorrect',
        reviewCount: reviewCount
        // Add SM-2 specific fields here later (e.g., easeFactor, consecutiveCorrect)
      };

      transaction.set(userDocRef, data, { merge: true });
    });

    console.log(`Spaced repetition data updated for question ${questionId}`);
     // Refresh the review queue display after updating
    if (typeof updateReviewQueue === 'function') {
        updateReviewQueue();
    }

  } catch (error) {
    console.error("Error updating spaced repetition data:", error);
  }
}
window.updateSpacedRepetitionData = updateSpacedRepetitionData; // Make globally available

// Function to fetch user's spaced repetition data
async function fetchSpacedRepetitionData() {
   // Add guest check
  if (!window.auth || !window.auth.currentUser) {
    console.log("fetchSpacedRepetitionData: No logged-in user.");
    return {}; // Return empty object for guests
  }
   if (!window.db) {
      console.log("DB not ready for fetchSpacedRepetitionData");
      return {};
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return data.spacedRepetition || {}; // Return data or empty object
    }
  } catch (error) {
    console.error("Error fetching spaced repetition data:", error);
  }
  return {}; // Return empty object on error or if doc doesn't exist
}
window.fetchSpacedRepetitionData = fetchSpacedRepetitionData; // Make globally available

// Clean up level up text on initial load
document.addEventListener('DOMContentLoaded', function() {
  const textNodes = document.querySelectorAll('body > *:not([id])');
  textNodes.forEach(node => {
    if (node.textContent && node.textContent.includes('LEVEL UP')) {
      node.remove();
    }
  });
   // Also hide the level up modal if it somehow exists on load
    const modal = document.getElementById('levelUpModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
});
