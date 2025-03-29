// --- START OF FILE user.js ---

// Session tracking
let questionStartTime = 0;
let sessionStartTime = Date.now();

// Fetch already answered questions from Firestore
async function fetchPersistentAnsweredIds() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) {
    console.log("System not ready for fetchPersistentAnsweredIds");
    return [];
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    if (userDocSnap.exists()){
      let data = userDocSnap.data();
      return Object.keys(data.answeredQuestions || {});
    }
  } catch (error) {
    console.error("Error fetching answered IDs:", error);
  }
  return [];
}

// Record answer in Firestore with XP calculation
async function recordAnswer(questionId, category, isCorrect, timeSpent) {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction || !window.getDoc) {
    console.log("System not ready to record answer");
    return;
  }

  const uid = window.auth.currentUser.uid;
  const userDocRef = window.doc(window.db, 'users', uid);

  try {
    let levelUp = false;
    let newLevel = 0;
    let totalXP = 0;

    await window.runTransaction(window.db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef); // Changed from window.getDoc to use transaction
      let data = userDoc.exists() ? userDoc.data() : {};

      // Initialize stats if needed
      if (!data.stats) {
        data.stats = {
          totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0, categories: {}, totalTimeSpent: 0,
          xp: 0, level: 1, achievements: {}, currentCorrectStreak: 0
        };
      }
      // Ensure sub-fields exist
      data.stats.xp = data.stats.xp ?? 0;
      data.stats.level = data.stats.level ?? 1;
      data.stats.achievements = data.stats.achievements ?? {};
      data.stats.currentCorrectStreak = data.stats.currentCorrectStreak ?? 0;
      data.answeredQuestions = data.answeredQuestions ?? {};
      data.streaks = data.streaks ?? { lastAnsweredDate: null, currentStreak: 0, longestStreak: 0 };
      data.stats.categories = data.stats.categories ?? {};

      // --- Start modification for streak/timestamp update ---
      const currentDate = new Date();
      const currentTimestamp = currentDate.getTime(); // Use Firebase server timestamp later if possible
      const currentFormatted = currentDate.toLocaleString();

      // Only record if not already answered *in this session/load*
      // The check `if (data.answeredQuestions[questionId]) return;` should happen *before* the transaction potentially
      // For now, assume the logic only calls recordAnswer for unanswered questions in the session.
      // Let's proceed with the update, assuming this is a new answer for the user overall.

      // Update streaks *before* checking if question already exists in DB if streak depends on *any* answer today
      const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
      let streakUpdated = false;
      const normalizedCurrent = normalizeDate(currentDate);

      if (data.streaks.lastAnsweredDate) {
        try {
            const lastDate = new Date(data.streaks.lastAnsweredDate);
            if (!isNaN(lastDate.getTime())) {
                const normalizedLast = normalizeDate(lastDate);
                const diffDays = Math.round((normalizedCurrent - normalizedLast) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    data.streaks.currentStreak = (data.streaks.currentStreak || 0) + 1;
                    streakUpdated = true;
                } else if (diffDays > 1) {
                    data.streaks.currentStreak = 1; // Reset streak
                    streakUpdated = true;
                }
                 // If diffDays is 0, don't change streak, just update lastAnsweredDate if needed
                data.streaks.lastAnsweredDate = currentDate.toISOString(); // Always update last answered date

            } else { // Handle invalid date format
                 console.warn("Invalid lastAnsweredDate in streaks, resetting streak.");
                 data.streaks.lastAnsweredDate = currentDate.toISOString();
                 data.streaks.currentStreak = 1;
                 streakUpdated = true;
            }
        } catch(e) {
             console.error("Error processing streak date:", e);
             // Fallback: Reset streak
             data.streaks.lastAnsweredDate = currentDate.toISOString();
             data.streaks.currentStreak = 1;
             streakUpdated = true;
        }

      } else { // No last answered date - first time answering?
        data.streaks.lastAnsweredDate = currentDate.toISOString();
        data.streaks.currentStreak = 1;
        streakUpdated = true;
      }

      if (data.streaks.currentStreak > (data.streaks.longestStreak || 0)) {
        data.streaks.longestStreak = data.streaks.currentStreak;
      }
      // --- End modification ---

      // Check if this specific question was already answered and stored in DB
      // We do this *after* potentially updating the streak for daily activity
      if (data.answeredQuestions[questionId]) {
          console.log(`Question ${questionId} already answered by user. Skipping stat/XP update.`);
          // Still need to save potential streak update
          transaction.set(userDocRef, { streaks: data.streaks }, { merge: true });
          return; // Exit the transaction function early
      }


      // --- Continue with recording the answer details and stats ---
      data.answeredQuestions[questionId] = {
        isCorrect, category, timestamp: currentTimestamp, timestampFormatted: currentFormatted, timeSpent
      };

      // Track consecutive correct answers
      if (isCorrect) {
        data.stats.currentCorrectStreak++;
      } else {
        data.stats.currentCorrectStreak = 0;
      }

      // Update basic stats
      data.stats.totalAnswered++;
      if (isCorrect) data.stats.totalCorrect++;
      else data.stats.totalIncorrect++;
      data.stats.totalTimeSpent = (data.stats.totalTimeSpent || 0) + timeSpent;

      // Update category stats
      if (!data.stats.categories[category]) {
        data.stats.categories[category] = { answered: 0, correct: 0, incorrect: 0 };
      }
      data.stats.categories[category].answered++;
      if (isCorrect) data.stats.categories[category].correct++;
      else data.stats.categories[category].incorrect++;

      // --- XP Calculation ---
      let earnedXP = 1; // Base XP
      let bonusXP = 0;
      let bonusMessages = [];

      if (isCorrect) earnedXP += 2; // Correct answer XP

      // --- Achievement Bonuses (One-time) ---
      if (data.stats.totalAnswered === 10 && !data.stats.achievements.first10Questions) {
        bonusXP += 50; bonusMessages.push("First 10 questions answered: +50 XP"); data.stats.achievements.first10Questions = true;
      }
      if (data.streaks.currentStreak === 7 && !data.stats.achievements.first7DayStreak) {
        bonusXP += 50; bonusMessages.push("7-day streak achieved: +50 XP"); data.stats.achievements.first7DayStreak = true;
      }
      if (data.stats.currentCorrectStreak === 5 && !data.stats.achievements.first5Correct) {
        bonusXP += 20; bonusMessages.push("First 5 correct in a row: +20 XP"); data.stats.achievements.first5Correct = true;
      }

      // --- Streak Bonuses (Awarded when streak increases) ---
      if (streakUpdated) {
        const streakMilestones = { 3: 5, 7: 15, 14: 30, 30: 75, 60: 150, 100: 500 };
        if (streakMilestones[data.streaks.currentStreak]) {
          const streakBonus = streakMilestones[data.streaks.currentStreak];
          bonusXP += streakBonus;
          bonusMessages.push(`${data.streaks.currentStreak}-day streak: +${streakBonus} XP`);
        }
      }

      // --- Correct Answer Milestone Bonuses ---
      if (isCorrect) {
        const correctMilestones = { 10: 10, 25: 25, 50: 75 }; // Add more if needed
         if (correctMilestones[data.stats.totalCorrect]) {
            const correctBonus = correctMilestones[data.stats.totalCorrect];
            bonusXP += correctBonus;
            bonusMessages.push(`${data.stats.totalCorrect} correct answers: +${correctBonus} XP`);
         }
      }

      // --- Consecutive Correct Answer Bonuses ---
       const consecutiveMilestones = { 5: 10, 10: 25, 20: 75 }; // Add more if needed
       if (consecutiveMilestones[data.stats.currentCorrectStreak]) {
          const consecutiveBonus = consecutiveMilestones[data.stats.currentCorrectStreak];
          bonusXP += consecutiveBonus;
          bonusMessages.push(`${data.stats.currentCorrectStreak} correct in a row: +${consecutiveBonus} XP`);
       }

      // --- Final XP Update ---
      const totalEarnedXP = earnedXP + bonusXP;
      data.stats.xp += totalEarnedXP;
      totalXP = data.stats.xp; // Store for level up check

      // Store bonus messages
      data.stats.lastBonusMessages = bonusMessages.length > 0 ? bonusMessages : null;

      // --- Level Update ---
      const oldLevel = data.stats.level;
      newLevel = calculateLevel(data.stats.xp);
      data.stats.level = newLevel;
      if (newLevel > oldLevel) {
        levelUp = true;
      }

      // --- Save all changes ---
      transaction.set(userDocRef, data, { merge: true });
    }); // End transaction

    console.log("Recorded answer for", questionId);

    // Update UI after successful transaction
    if (typeof updateUserXP === 'function') updateUserXP();
    if (typeof updateUserMenu === 'function') updateUserMenu();
    if (typeof initializeDashboard === 'function') initializeDashboard(); // Update dashboard view

    // Show level-up animation if applicable
    if (levelUp) {
      setTimeout(() => {
         if (typeof showLevelUpAnimation === 'function') showLevelUpAnimation(newLevel, totalXP);
      }, 1000);
    }

  } catch (error) {
    console.error("Error recording answer:", error);
    // Handle error appropriately, maybe inform the user
  }
}


// Calculate level based on XP thresholds
function calculateLevel(xp) {
  const levelThresholds = [
    0, 30, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000, 2750, 3750, 5000, 6500
  ];
  let level = 1;
  for (let i = 1; i < levelThresholds.length; i++) {
    if (xp >= levelThresholds[i]) level = i + 1;
    else break;
  }
  return level;
}

// Calculate progress to next level (as percentage)
function calculateLevelProgress(xp) {
  const levelThresholds = [
    0, 30, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000, 2750, 3750, 5000, 6500
  ];
  const level = calculateLevel(xp);
  if (level >= levelThresholds.length) return 100; // Max level

  const currentLevelXp = levelThresholds[level - 1];
  const nextLevelXp = levelThresholds[level];
  const xpInCurrentLevel = xp - currentLevelXp;
  const xpRequiredForNextLevel = nextLevelXp - currentLevelXp;
  return Math.min(100, Math.floor((xpInCurrentLevel / xpRequiredForNextLevel) * 100));
}

// XP info for a specific level
function getLevelInfo(level) {
  const levelThresholds = [
    0, 30, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000, 2750, 3750, 5000, 6500
  ];
  const actualLevel = Math.min(level, levelThresholds.length);
  const currentLevelXp = levelThresholds[actualLevel - 1] ?? levelThresholds[levelThresholds.length - 1]; // Handle max level case better
  let nextLevelXp = null;
  if (actualLevel < levelThresholds.length) nextLevelXp = levelThresholds[actualLevel];
  return { currentLevelXp, nextLevelXp };
}


// Update question stats in Firestore (Separate collection for scalability)
async function updateQuestionStats(questionId, isCorrect) {
  if (!window.db || !window.doc || !window.runTransaction || !window.getDoc) {
    console.log("System not ready for updateQuestionStats");
    return;
  }

  console.log("updateQuestionStats called for:", questionId, "isCorrect:", isCorrect);
  const questionStatsRef = window.doc(window.db, "questionStats", questionId); // Assuming 'questionStats' collection
  try {
    await window.runTransaction(window.db, async (transaction) => {
      const statsDoc = await transaction.get(questionStatsRef);
      let statsData = statsDoc.exists() ? statsDoc.data() : { totalAttempts: 0, correctAttempts: 0 };
      statsData.totalAttempts = (statsData.totalAttempts || 0) + 1;
      if (isCorrect) {
        statsData.correctAttempts = (statsData.correctAttempts || 0) + 1;
      }
      transaction.set(questionStatsRef, statsData, { merge: true });
    });
    console.log("Updated stats for question", questionId);
  } catch (error) {
    console.error("Error updating question stats:", error);
  }
}

// Update user XP display in UI elements
async function updateUserXP() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) {
    console.log("System not ready for updateUserXP");
    return;
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const xp = data.stats?.xp || 0;
      const level = data.stats?.level || 1;
      const progress = calculateLevelProgress(xp);

      // Top Bar Level Circle
      const scoreCircle = document.getElementById("scoreCircle");
      if (scoreCircle) scoreCircle.textContent = level;

      // Top Bar XP Text
      const xpDisplay = document.getElementById("xpDisplay");
      if (xpDisplay) xpDisplay.textContent = `${xp} XP`;

      // User Menu Level Circle
      const userScoreCircle = document.getElementById("userScoreCircle");
      if (userScoreCircle) userScoreCircle.textContent = level;

      // User Menu XP Text
      const userXpDisplay = document.getElementById("userXpDisplay");
      if (userXpDisplay) {
        const levelInfo = getLevelInfo(level);
        if (levelInfo.nextLevelXp !== null) {
          userXpDisplay.textContent = `${xp}/${levelInfo.nextLevelXp} XP`;
        } else {
          userXpDisplay.textContent = `${xp} XP (Max Level)`;
        }
      }

      // Update Progress Visuals (Circles/Bars)
      if (typeof updateLevelProgress === 'function') {
        updateLevelProgress(progress);
      } else {
         console.warn("updateLevelProgress function not found");
      }

      // --- Bonus Message Handling ---
      const lastBonusMessages = data.stats?.lastBonusMessages;
      // Check if the notification container exists AND has children to avoid race conditions
      const notificationsContainer = document.getElementById("xpNotifications");
      const notificationsExist = notificationsContainer && notificationsContainer.children.length > 0;

      if (lastBonusMessages && Array.isArray(lastBonusMessages) && lastBonusMessages.length > 0 && !notificationsExist) {
         if (typeof showBonusMessages === 'function') {
             showBonusMessages(lastBonusMessages);
         } else {
             console.warn("showBonusMessages function not found");
         }

        // Clear the messages in Firestore *after* showing them
        if (window.runTransaction) { // Ensure function exists
           await window.runTransaction(window.db, async (transaction) => {
             const latestUserDoc = await transaction.get(userDocRef); // Get latest doc within transaction
             if (latestUserDoc.exists()) {
               const latestUserData = latestUserDoc.data();
               if (latestUserData.stats) {
                 latestUserData.stats.lastBonusMessages = null;
                 transaction.set(userDocRef, latestUserData, { merge: true });
               }
             }
           }).catch(err => console.error("Error clearing bonus messages:", err));
        }
      }
      // --- End Bonus Message Handling ---

    } else {
        console.log("User document doesn't exist in updateUserXP");
        // Maybe set defaults in UI?
        const scoreCircle = document.getElementById("scoreCircle"); if (scoreCircle) scoreCircle.textContent = '1';
        const xpDisplay = document.getElementById("xpDisplay"); if (xpDisplay) xpDisplay.textContent = `0 XP`;
        // etc. for other UI elements
    }
  } catch (error) {
    console.error("Error updating user XP display:", error);
  }
}


// Show bonus messages as notifications
function showBonusMessages(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) return;

  // Ensure container exists or create it
  let notificationContainer = document.getElementById("xpNotifications");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "xpNotifications";
    Object.assign(notificationContainer.style, {
      position: "fixed", top: "70px", right: "20px", zIndex: "9999",
      display: 'flex', flexDirection: 'column', gap: '10px' // Use flexbox for spacing
    });
    document.body.appendChild(notificationContainer);
  }

  // Function to create and animate a single notification
  const createNotification = (message, index) => {
    const notification = document.createElement("div");
    notification.className = "xp-notification";
    notification.innerHTML = `<div class="xp-icon" style="margin-right: 10px; font-size: 1.3rem;">✨</div><div>${message}</div>`; // Wrap message text
    Object.assign(notification.style, {
      backgroundColor: "#0056b3", color: "white", padding: "10px 15px",
      borderRadius: "6px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
      display: "flex", alignItems: "center", opacity: "0",
      transform: "translateX(50px)", transition: "opacity 0.5s ease, transform 0.5s ease"
    });

    notificationContainer.appendChild(notification);

    // Animate in after a slight delay based on index
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateX(0)";
    }, 100 * index);

    // Schedule removal
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(50px)";
      // Remove from DOM after fade out transition
      setTimeout(() => {
         notification.remove();
         // If container is empty after removal, remove container itself
         if (notificationContainer.children.length === 0) {
             notificationContainer.remove();
         }
     }, 500); // Matches transition duration
    }, 5000 + 100 * index); // Stagger removal slightly
  };

  // Create notifications for each message
  messages.forEach(createNotification);
}


// Update the user menu with current username and score
async function updateUserMenu() {
  if (!window.auth || !window.auth.currentUser) {
    console.log("Auth not initialized for updateUserMenu");
    return;
  }

  try {
    let username = "Guest"; // Default
    if (typeof getOrGenerateUsername === 'function'){
       username = await getOrGenerateUsername();
    } else {
       console.warn("getOrGenerateUsername function not found");
    }

    const usernameDisplay = document.getElementById("usernameDisplay");
    if (usernameDisplay) {
      usernameDisplay.textContent = username;
    }

    // Update XP/Level display in the menu
    if (typeof updateUserXP === 'function') {
       await updateUserXP(); // Make sure XP/Level is up-to-date
    } else {
       console.warn("updateUserXP function not found");
    }
  } catch (error) {
    console.error("Error updating user menu:", error);
  }
}

// Get or generate a username
async function getOrGenerateUsername() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc || !window.runTransaction) {
    // console.warn("System not ready for getOrGenerateUsername"); // Too noisy?
    return "Guest"; // Return default if system isn't ready
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);

    if (userDocSnap.exists() && userDocSnap.data().username) {
      return userDocSnap.data().username;
    } else {
      // User doc might exist but without username (e.g., anonymous first load)
      // Or user doc doesn't exist yet (should be handled by auth state change, but fallback here)
      const newUsername = generateRandomName();
      console.log(`Generating username for ${uid}: ${newUsername}`);
      await window.runTransaction(window.db, async (transaction) => {
        // Read the doc again *inside* the transaction
        const docInTransaction = await transaction.get(userDocRef);
        let data = docInTransaction.exists() ? docInTransaction.data() : {};
        // Only set username if it doesn't already exist to avoid race conditions
        if (!data.username) {
           data.username = newUsername;
           // Set or update the document
           transaction.set(userDocRef, data, { merge: true });
        } else {
             console.log("Username already set in transaction, skipping generation.");
             // If username exists now, use it instead of the generated one
             return data.username;
        }
      });
      // Re-fetch after transaction to be sure, although runTransaction should handle consistency
      // const updatedSnap = await window.getDoc(userDocRef);
      // return updatedSnap.exists() ? (updatedSnap.data().username || newUsername) : newUsername;
      return newUsername; // Return the generated name optimistically
    }
  } catch (error) {
      console.error("Error in getOrGenerateUsername:", error);
      return "Guest Error"; // Return error indicator
  }
}


// Generate a random username
function generateRandomName() {
  const adjectives = ["Aural", "Otologic", "Laryngo", "Rhino", "Acoustic", "Vocal", "Expert", "Master", "Skillful"];
  const nouns = ["Cochlea", "Tympanum", "Glottis", "Sinus", "Auricle", "Eustachian", "Scalpel", "Endoscope", "Needle", "Foramen"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}${noun}${num}`;
}

// Bookmark functions - enhanced for toggling
async function getBookmarks() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) {
    console.log("System not ready for getBookmarks");
    return [];
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    if(userDocSnap.exists()){
      const data = userDocSnap.data();
      return data.bookmarks || []; // Return empty array if 'bookmarks' field doesn't exist
    }
  } catch (error) {
    console.error("Error getting bookmarks:", error);
  }
  return [];
}

// Toggle a bookmark (add if not present, remove if present)
async function toggleBookmark(questionId) {
   if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction || !window.getDoc) {
    console.log("System not ready for toggleBookmark");
    return false; // Indicate failure or inability to toggle
  }

  if (!questionId || typeof questionId !== 'string' || questionId.trim() === '') {
     console.error("Invalid questionId provided to toggleBookmark");
     return false;
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    let isBookmarked = false; // Track the final state

    await window.runTransaction(window.db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      let data = userDoc.exists() ? userDoc.data() : {};
      let bookmarks = data.bookmarks || []; // Initialize bookmarks array if it doesn't exist

      const index = bookmarks.indexOf(questionId);

      if (index === -1) { // Not bookmarked -> Add
        bookmarks.push(questionId);
        isBookmarked = true;
      } else { // Already bookmarked -> Remove
        bookmarks.splice(index, 1);
        isBookmarked = false;
      }

      // Update the document within the transaction
      transaction.set(userDocRef, { bookmarks: bookmarks }, { merge: true });
    });

    // Update the UI immediately after successful transaction
    const currentSlide = document.querySelector(`.swiper-slide[data-id="${questionId}"]`);
    if (currentSlide) {
      currentSlide.dataset.bookmarked = isBookmarked ? "true" : "false";
    }
     // Also update the favorite button icon if it's the current question
    const favoriteButton = document.getElementById("favoriteButton");
    const currentVisibleQuestionId = typeof getCurrentQuestionId === 'function' ? getCurrentQuestionId() : null;
    if (favoriteButton && currentVisibleQuestionId === questionId) {
         favoriteButton.innerText = isBookmarked ? "★" : "☆";
         favoriteButton.style.color = isBookmarked ? "#007BFF" : "";
    }


    return isBookmarked; // Return the *new* state

  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return false; // Indicate failure
  }
}


// Function to show the level-up modal and animation
function showLevelUpAnimation(newLevel, totalXP) {
   // Check if modal already exists
   let modal = document.getElementById('levelUpModal');
   if (!modal) {
       modal = document.createElement('div');
       modal.id = 'levelUpModal';
       // Use textContent for security and simplicity where possible
       modal.innerHTML = `
         <div id="levelUpContent">
           <div id="levelUpHeader">
             <h2 id="levelUpTitle">LEVEL UP!</h2>
           </div>
           <div id="levelUpBadge">
             <span id="levelNumber"></span>
           </div>
           <div id="levelUpBody">
             <p id="levelUpMessage"></p>
             <p id="levelUpXP"></p>
             <button id="levelUpButton">Continue</button>
           </div>
         </div>
       `;
       document.body.appendChild(modal);

       // Add event listener ONCE when modal is created
       const closeButton = document.getElementById('levelUpButton');
       if (closeButton) {
           closeButton.addEventListener('click', hideLevelUpModal); // Reference the hide function
       } else {
           console.error("Could not find level up close button to attach listener.");
       }
   }

   // --- Update modal content ---
   const levelNumberEl = document.getElementById('levelNumber');
   const levelUpXPEl = document.getElementById('levelUpXP');
   const levelUpMessageEl = document.getElementById('levelUpMessage');

   if (levelNumberEl) levelNumberEl.textContent = newLevel;
   if (levelUpXPEl) levelUpXPEl.textContent = `Total XP: ${totalXP}`;

   // Custom messages
   let message = "Congratulations! Keep up the good work!";
   if (newLevel >= 10) message = "Amazing progress! You've reached an elite level!";
   else if (newLevel >= 5) message = "Great job! You're becoming a master!";
   if(levelUpMessageEl) levelUpMessageEl.textContent = message;

   // --- Show modal ---
   modal.style.display = 'flex';
   // Trigger fade-in animation (slight delay ensures transition works)
   requestAnimationFrame(() => {
       requestAnimationFrame(() => {
           modal.style.opacity = '1';
       });
   });

   // --- Effects ---
   if (typeof createConfetti === 'function') createConfetti();

   // Play sound effect
   if (window.Audio) {
     try {
       // Choose a suitable sound URL
       const levelUpSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_c4b035d4a7.mp3?filename=level-up-arcade-6442.mp3'); // Example sound
       levelUpSound.volume = 0.4; // Adjust volume
       levelUpSound.play().catch(e => console.log("Audio play prevented:", e)); // Catch play errors
     } catch (e) {
       console.log("Audio could not be played", e);
     }
   }
}


// Function to hide the level-up modal
function hideLevelUpModal() {
  const modal = document.getElementById('levelUpModal');
  if (modal) {
    modal.style.opacity = '0';
    // Wait for fade out transition before hiding
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300); // Should match transition duration
  }
}

// Function to create confetti effect
function createConfetti() {
   const modal = document.getElementById('levelUpModal');
   if (!modal) return;

   const confettiContainer = document.createElement('div');
   confettiContainer.style.position = 'absolute';
   confettiContainer.style.top = '0';
   confettiContainer.style.left = '0';
   confettiContainer.style.width = '100%';
   confettiContainer.style.height = '100%';
   confettiContainer.style.overflow = 'hidden';
   confettiContainer.style.pointerEvents = 'none'; // Allow clicks through
   confettiContainer.style.zIndex = '5'; // Below content but above background
   modal.querySelector('#levelUpContent').insertBefore(confettiContainer, modal.querySelector('#levelUpHeader')); // Insert before header

   const colors = ['#FFC700', '#FF3D00', '#00C853', '#2979FF', '#AA00FF', '#D500F9'];
   const confettiCount = 50;

   for (let i = 0; i < confettiCount; i++) {
       const confetti = document.createElement('div');
       confetti.className = 'confetti'; // Use class for potential CSS targeting
       const size = 5 + Math.random() * 5;
       Object.assign(confetti.style, {
           position: 'absolute',
           width: `${size}px`,
           height: `${size}px`,
           backgroundColor: colors[Math.floor(Math.random() * colors.length)],
           borderRadius: `${Math.random() * 3}px`, // Slight shape variation
           left: Math.random() * 100 + '%',
           top: '-10%', // Start above the modal
           opacity: '1',
           transform: `rotate(${Math.random() * 360}deg)`,
           // Use CSS animation defined in styles.css for falling
           animation: `confettiFall ${1.5 + Math.random() * 1}s ${Math.random() * 0.5}s linear forwards`
       });
       confettiContainer.appendChild(confetti);
   }

   // Clean up the container after animation finishes (longest possible duration)
   setTimeout(() => {
      confettiContainer.remove();
   }, 2500); // 1.5s base + 1s random duration + 0.5s random delay
}


// Clean up any existing LEVEL UP text on page load (just in case)
document.addEventListener('DOMContentLoaded', function() {
  const textNodes = document.querySelectorAll('body > *:not([id]):not(script):not(style)');
  textNodes.forEach(node => {
    if (node.textContent && node.textContent.includes('LEVEL UP')) {
      console.log("Removing stray 'LEVEL UP' text node on load.");
      node.remove();
    }
  });
});

// Function to update spaced repetition data for a question
async function updateSpacedRepetitionData(questionId, isCorrect, difficulty, nextReviewInterval) {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction) {
    console.log("System not ready for updateSpacedRepetitionData");
    return;
  }
   if (!questionId || typeof questionId !== 'string' || questionId.trim() === '') {
     console.error("Invalid questionId provided to updateSpacedRepetitionData");
     return ;
  }

  const uid = window.auth.currentUser.uid;
  const userDocRef = window.doc(window.db, 'users', uid);

  try {
    await window.runTransaction(window.db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      let data = userDoc.exists() ? userDoc.data() : {};
      data.spacedRepetition = data.spacedRepetition || {}; // Ensure object exists

      const now = new Date();
      const nextReviewDate = new Date();
      // Ensure interval is a positive number, default to 1 if invalid
      const intervalDays = (typeof nextReviewInterval === 'number' && nextReviewInterval > 0) ? nextReviewInterval : 1;
      nextReviewDate.setDate(now.getDate() + intervalDays);

      // Retrieve existing review count, default to 0 if not present
      const currentReviewCount = data.spacedRepetition[questionId]?.reviewCount || 0;

      data.spacedRepetition[questionId] = {
        lastReviewedAt: now.toISOString(),
        nextReviewDate: nextReviewDate.toISOString(),
        reviewInterval: intervalDays, // Store the validated interval
        difficulty: difficulty, // Store user's perceived difficulty
        lastResult: isCorrect ? 'correct' : 'incorrect',
        reviewCount: currentReviewCount + 1 // Increment review count
      };

      transaction.set(userDocRef, data, { merge: true });
    });

    console.log(`Spaced repetition data updated for question ${questionId}`);
    // Optionally update the review queue display immediately
     if(typeof updateReviewQueue === 'function') updateReviewQueue();

  } catch (error) {
    console.error("Error updating spaced repetition data:", error);
  }
}

// Make the function available globally if not already (or rely on script scope)
// window.updateSpacedRepetitionData = updateSpacedRepetitionData;

// Function to fetch user's spaced repetition data
async function fetchSpacedRepetitionData() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) {
    console.log("System not ready for fetchSpacedRepetitionData");
    return {}; // Return empty object instead of null
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return data.spacedRepetition || {}; // Return empty object if field doesn't exist
    }
  } catch (error) {
    console.error("Error fetching spaced repetition data:", error);
  }
  return {}; // Return empty object on error or if doc doesn't exist
}

// Make the function available globally if not already (or rely on script scope)
// window.fetchSpacedRepetitionData = fetchSpacedRepetitionData;


// ==============================================================
// == NEW FUNCTIONS ADDED FOR DASHBOARD INITIALIZATION/EVENTS ==
// ==============================================================

// Dashboard initialization and functionality
async function initializeDashboard() {
    const mainOptions = document.getElementById("mainOptions");
    // Ensure dashboard element exists and is visible before proceeding
    if (!mainOptions || mainOptions.style.display === 'none') {
        console.log("Dashboard not visible or not found, skipping initialization.");
        return;
    }

    console.log("Initializing dashboard..."); // Log start

    // Check essential Firebase/Auth objects
    if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) {
        console.error("System not ready for dashboard initialization (Auth/DB missing).");
        // Optionally display an error message to the user on the dashboard element
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

            // --- Update Level & XP Card ---
            const xp = stats.xp || 0;
            const level = stats.level || 1;
            const progress = typeof calculateLevelProgress === 'function' ? calculateLevelProgress(xp) : 0;

            const dashboardLevel = document.getElementById("dashboardLevel");
            if (dashboardLevel) dashboardLevel.textContent = level;

            const dashboardXP = document.getElementById("dashboardXP");
            if (dashboardXP) dashboardXP.textContent = `${xp} XP`;

            const dashboardNextLevel = document.getElementById("dashboardNextLevel");
            if (dashboardNextLevel) {
                const levelInfo = typeof getLevelInfo === 'function' ? getLevelInfo(level) : { nextLevelXp: null };
                if (levelInfo.nextLevelXp !== null) {
                    const xpNeeded = levelInfo.nextLevelXp - xp;
                    dashboardNextLevel.textContent = xpNeeded > 0 ? `${xpNeeded} XP to Level ${level + 1}` : `Level ${level+1} unlocked!`;
                } else {
                    dashboardNextLevel.textContent = 'Max Level Reached!';
                }
            }

            const dashboardLevelProgress = document.getElementById("dashboardLevelProgress");
            if (dashboardLevelProgress) dashboardLevelProgress.style.setProperty('--progress', `${progress}%`);


            // --- Update Quick Stats Card ---
            const totalAnswered = stats.totalAnswered || 0;
            const totalCorrect = stats.totalCorrect || 0;
            const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

            const dashboardAnswered = document.getElementById("dashboardAnswered");
            if (dashboardAnswered) dashboardAnswered.textContent = totalAnswered;

            const dashboardAccuracy = document.getElementById("dashboardAccuracy");
            if (dashboardAccuracy) dashboardAccuracy.textContent = `${accuracy}%`;


            // --- Update Streak Card ---
            const currentStreakElement = document.getElementById("currentStreak");
            if (currentStreakElement) {
                currentStreakElement.textContent = streaks.currentStreak || 0;
            }
            // Update the calendar visual
            if (typeof fixStreakCalendar === 'function') fixStreakCalendar(streaks);


            // --- Load Leaderboard Preview ---
            if (typeof loadLeaderboardPreview === 'function') {
                 loadLeaderboardPreview();
            } else {
                 console.warn("loadLeaderboardPreview function not found");
            }


            // --- Load Review Queue Data ---
            if (typeof updateReviewQueue === 'function') {
                updateReviewQueue();
            } else {
                console.warn("updateReviewQueue function not found");
            }


            console.log("Dashboard initialized successfully."); // Log success

        } else {
             console.warn("User document does not exist for dashboard init.");
             // Handle case where user doc might be missing (e.g., set defaults in UI)
             // Example: document.getElementById("dashboardLevel").textContent = '1';
        }
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        // Optionally display an error message on the dashboard
    }
}

// Set up event listeners for dashboard cards and modals
function setupDashboardEvents() {
    console.log("Setting up dashboard event listeners..."); // Log start

    // Helper to prevent duplicate listeners
    const addClickListenerOnce = (elementId, handler) => {
        const element = document.getElementById(elementId);
        if (element) {
           // Remove existing listener before adding, just to be safe
           // Note: This requires the handler function to be defined outside or consistently referenced
           // A simpler approach is the flag method used before:
            if (!element._hasClickListener) {
                element.addEventListener('click', handler);
                element._hasClickListener = true; // Mark as attached
                console.log(`Event listener attached to #${elementId}`);
            } else {
                // console.log(`Event listener already attached to #${elementId}`); // Can be noisy
            }
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
    // Note: These listeners might be better placed where the modal is created/managed
    // if the modal isn't always in the initial DOM. But if it is, this is okay.
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
        else console.error("displayPerformance function not defined");
    });

    addClickListenerOnce("quickStatsCard", function() {
         if(typeof displayPerformance === 'function') displayPerformance();
         else console.error("displayPerformance function not defined");
    });

    addClickListenerOnce("leaderboardPreviewCard", function() {
        if(typeof showLeaderboard === 'function') showLeaderboard();
        else console.error("showLeaderboard function not defined");
    });

    addClickListenerOnce("reviewQueueCard", async function() {
        // Check for required functions before proceeding
        if(typeof countDueReviews !== 'function' || typeof getDueQuestionIds !== 'function' || typeof loadSpecificQuestions !== 'function') {
            console.error("Required review functions not found for reviewQueueCard click.");
            alert("Cannot start review session at this time.");
            return;
        }

        try {
            const { dueCount } = await countDueReviews();
            if (dueCount === 0) {
                alert("You have no questions due for review today. Good job!");
                return;
            }

            const dueQuestionIds = await getDueQuestionIds();
            if (dueQuestionIds.length === 0) {
                alert("No questions found for review. This might happen if review data is inconsistent.");
                return;
            }
            loadSpecificQuestions(dueQuestionIds);
        } catch (error) {
             console.error("Error handling reviewQueueCard click:", error);
             alert("An error occurred while trying to start the review session.");
        }
    });

     console.log("Dashboard event listeners setup potentially completed."); // Log end
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
      // Ensure stats and xp exist before adding
      if (data.stats && typeof data.stats.xp === 'number') {
        leaderboardEntries.push({
          uid: docSnap.id,
          username: data.username || "Anonymous",
          xp: data.stats.xp
        });
      }
    });

    // Sort by XP (descending)
    leaderboardEntries.sort((a, b) => b.xp - a.xp);

    // Get top 3
    let top3 = leaderboardEntries.slice(0, 3);

    // Find current user's position
    let currentUserRank = -1;
    let currentUserEntry = null;
    for(let i=0; i < leaderboardEntries.length; i++){
        if(leaderboardEntries[i].uid === currentUid){
            currentUserRank = i + 1;
            currentUserEntry = leaderboardEntries[i];
            break;
        }
    }
    // Determine if current user should be shown separately (not in top 3 but exists)
    let showCurrentUserSeparately = currentUserRank > 3 && currentUserEntry;

    // Create HTML for the preview
    let html = '';

    if (top3.length === 0) {
      html = '<div class="leaderboard-loading">No leaderboard data yet</div>';
    } else {
      top3.forEach((entry, index) => {
        const isCurrentUser = entry.uid === currentUid;
        const rank = index + 1;
        // Add '(You)' tag directly if user is in top 3
        const usernameDisplay = `${entry.username}${isCurrentUser ? ' (You)' : ''}`;
        html += `
          <div class="leaderboard-preview-entry ${isCurrentUser ? 'current-user-entry' : ''}">
            <div class="leaderboard-rank leaderboard-rank-${rank}">${rank}</div>
            <div class="leaderboard-user-info">
              <div class="leaderboard-username">${usernameDisplay}</div>
              <div class="leaderboard-user-xp">${entry.xp} XP</div>
            </div>
          </div>
        `;
      });

      // Add current user's entry if they exist and are ranked *outside* the top 3
      if (showCurrentUserSeparately) {
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

// Function to update the Review Queue card in the dashboard
async function updateReviewQueue() {
  const reviewCountElement = document.getElementById("reviewCount");
  const reviewQueueContent = document.getElementById("reviewQueueContent");
  const reviewProgressBar = document.getElementById("reviewProgressBar");

  // Ensure all elements exist before proceeding
  if (!reviewCountElement || !reviewQueueContent || !reviewProgressBar) {
     console.warn("Review queue UI elements not found.");
     return;
  }
   // Ensure necessary functions exist
  if (typeof countDueReviews !== 'function') {
     console.error("countDueReviews function not found");
     return;
  }


  try {
      const { dueCount, nextReviewDate } = await countDueReviews();

      reviewCountElement.textContent = dueCount;

      // Get pointers to the specific divs inside the content area
      const reviewStatsDiv = reviewQueueContent.querySelector(".review-stats");
      const emptyStateDiv = reviewQueueContent.querySelector(".review-empty-state");
      const progressContainer = reviewQueueContent.querySelector(".review-progress-container");

      // Check if these inner elements exist before manipulating them
      if (!reviewStatsDiv || !progressContainer ) {
         console.warn("Inner review queue elements (stats, progress) not found.");
         // We might still be able to update the empty state
      }

      if (dueCount > 0) {
          // Show stats and progress bar
          if (reviewStatsDiv) reviewStatsDiv.style.display = 'block'; // Or 'flex' depending on CSS
          if (progressContainer) progressContainer.style.display = 'block'; // Or 'flex'
          if (emptyStateDiv) emptyStateDiv.style.display = 'none'; // Hide empty state

          // Calculate and set progress bar width
          const progressPercent = Math.min(100, (dueCount / 20) * 100); // Example target: 20 reviews = 100%
          reviewProgressBar.style.width = `${progressPercent}%`;

      } else {
          // Hide stats and progress bar
          if (reviewStatsDiv) reviewStatsDiv.style.display = 'none';
          if (progressContainer) progressContainer.style.display = 'none';

          // Prepare empty state message
          let emptyStateMessage = "";
          if (nextReviewDate) {
              // Format date nicely, e.g., "Oct 23" or "Tomorrow"
              const today = new Date(); today.setHours(0,0,0,0);
              const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
              let formattedDate;
              if (nextReviewDate.getTime() === tomorrow.getTime()) {
                 formattedDate = "Tomorrow";
              } else {
                 formattedDate = nextReviewDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }
              emptyStateMessage = `No reviews due today.<br>Next review: <span class="next-review-date">${formattedDate}</span>`;
          } else {
              emptyStateMessage = "No reviews scheduled. Complete quizzes to add reviews.";
          }

          // Update or create the empty state element
          let currentEmptyStateDiv = reviewQueueContent.querySelector(".review-empty-state");
          if (currentEmptyStateDiv) {
             currentEmptyStateDiv.innerHTML = emptyStateMessage;
             currentEmptyStateDiv.style.display = 'block'; // Ensure it's visible
          } else {
             // Create if it doesn't exist
             const newEmptyStateDiv = document.createElement("div");
             newEmptyStateDiv.className = "review-empty-state";
             newEmptyStateDiv.style.textAlign = 'center'; // Add basic styling
             newEmptyStateDiv.style.color = '#666';
             newEmptyStateDiv.style.fontSize = '0.9rem';
             newEmptyStateDiv.style.padding = '10px 0';
             newEmptyStateDiv.innerHTML = emptyStateMessage;
             // Append it logically within the card content
             reviewQueueContent.appendChild(newEmptyStateDiv);
          }
      }
  } catch (error) {
       console.error("Error updating review queue UI:", error);
       // Optionally display an error message in the card
       reviewCountElement.textContent = 'Err';
       // Could update empty state div with error message too
  }
}


// Function to fix streak calendar alignment
function fixStreakCalendar(streaksData) {
    const streakCalendar = document.getElementById("streakCalendar");
    if (!streakCalendar) {
        console.warn("Streak calendar element not found.");
        return;
    }

    streakCalendar.innerHTML = ''; // Clear existing

    const today = new Date(); today.setHours(0, 0, 0, 0); // Normalize today to start of day
    let todayDayIndex = today.getDay() - 1; // 0=Mon, 6=Sun
    if (todayDayIndex < 0) todayDayIndex = 6;

    const currentStreak = streaksData?.currentStreak || 0;
    const lastAnsweredDateStr = streaksData?.lastAnsweredDate;
    let lastAnsweredDate = null;

    // Try to parse lastAnsweredDate, normalize it
    if(lastAnsweredDateStr) {
       try {
          const parsedDate = new Date(lastAnsweredDateStr);
          if (!isNaN(parsedDate.getTime())) {
              lastAnsweredDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
          } else {
              console.warn("Invalid lastAnsweredDate string:", lastAnsweredDateStr);
          }
       } catch(e) { console.error("Error parsing lastAnsweredDate:", e); }
    }

    // Calculate the start date of the *current* visual week (past Monday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - todayDayIndex); // Go back to Monday

    for (let i = 0; i < 7; i++) {
        // Calculate the date for the current position in the week display
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);

        const dayCircle = document.createElement("div");
        dayCircle.className = "day-circle";
        dayCircle.textContent = date.getDate(); // Display the day of the month

        // Check if this is today
        if (date.getTime() === today.getTime()) {
            dayCircle.classList.add("today");
        }

        // Check if this day should be marked as active based on the streak *ending on the last answered date*
        if (currentStreak > 0 && lastAnsweredDate) {
            // Calculate the difference in days between the calendar date and the last answered date
            const diffDays = Math.round((lastAnsweredDate - date) / (1000 * 60 * 60 * 24));

            // Mark as active if:
            // 1. The date is on or before the last answered date (diffDays >= 0)
            // 2. The date is within the range of the current streak length from the last answered date (diffDays < currentStreak)
            // 3. The date is not in the future relative to today
             if (diffDays >= 0 && diffDays < currentStreak && date <= today) {
                 dayCircle.classList.add("active");
             }
        }
        streakCalendar.appendChild(dayCircle);
    }
}


// Function to get IDs of questions due for review
async function getDueQuestionIds() {
  // Ensure necessary Firebase objects are available
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) {
    console.warn("System not ready for getDueQuestionIds.");
    return [];
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);

    if (!userDocSnap.exists()) return []; // No user document, no reviews

    const data = userDocSnap.data();
    const spacedRepetitionData = data.spacedRepetition || {};

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
    let dueQuestionIds = [];

    for (const questionId in spacedRepetitionData) {
      const reviewData = spacedRepetitionData[questionId];
      if (!reviewData || !reviewData.nextReviewDate) continue; // Skip if no next review date

      try {
        const reviewDate = new Date(reviewData.nextReviewDate);
        if (isNaN(reviewDate.getTime())) {
            console.warn(`Invalid nextReviewDate for Q ${questionId}: ${reviewData.nextReviewDate}`);
            continue; // Skip invalid date
        }

        // Normalize review date to the start of its day
        const reviewDateOnly = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());

        // Check if the review date is today or in the past
        if (reviewDateOnly <= today) {
          dueQuestionIds.push(questionId);
        }
      } catch (e) {
         console.warn(`Error processing date for Q ${questionId}:`, reviewData.nextReviewDate, e);
      }
    }
    console.log(`Found ${dueQuestionIds.length} questions due for review.`);
    return dueQuestionIds;
  } catch (error) {
    console.error("Error getting due question IDs:", error);
    return [];
  }
}

// Function to load only specific questions by ID for review session
async function loadSpecificQuestions(questionIds) {
  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    alert("No questions selected for review.");
    return;
  }

  console.log(`Starting review session with ${questionIds.length} specific questions.`);

  // Ensure PapaParse, csvUrl, shuffleArray, and initializeQuiz are available
  if (typeof Papa === 'undefined' || typeof csvUrl === 'undefined' || typeof shuffleArray !== 'function' || typeof initializeQuiz !== 'function') {
     console.error("Missing required dependencies for loadSpecificQuestions (PapaParse, csvUrl, shuffleArray, initializeQuiz).");
     alert("Error preparing review session. Please try again.");
     return;
  }

  try {
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: function(results) {
        if (!results || !results.data || results.errors.length > 0) {
           console.error("Failed to parse or download CSV data:", results?.errors);
           alert("Error loading question data. Please check your connection and try again.");
           return;
        }
        console.log("Base question bank loaded:", results.data.length);

        // Filter the full bank to get only the questions matching the provided IDs
        // Ensure 'Question' field exists and handle potential leading/trailing whitespace
        const reviewQuestions = results.data.filter(q =>
          q && q["Question"] && questionIds.includes(q["Question"].trim())
        );

        console.log("Filtered review questions matching IDs:", reviewQuestions.length);

        if (reviewQuestions.length === 0) {
          alert("Could not find the questions scheduled for review. They might have been updated or removed from the main question bank.");
          // Navigate back or show dashboard?
          const mainOptions = document.getElementById("mainOptions");
          if(mainOptions) mainOptions.style.display = 'flex';
          return;
        }
        if (reviewQuestions.length < questionIds.length) {
             console.warn(`Could only find ${reviewQuestions.length} out of ${questionIds.length} scheduled review questions.`);
             // Proceed with the ones found
        }

        // Shuffle the selected review questions
        const shuffledReviewQuestions = shuffleArray([...reviewQuestions]);

        // Initialize the quiz interface with these specific questions
        initializeQuiz(shuffledReviewQuestions);
      },
      error: function(error) {
        console.error("Network or parsing error loading question bank:", error);
        alert("Error loading questions. Please check your internet connection and try again.");
      }
    });
  } catch (e) {
      console.error("Unexpected error in loadSpecificQuestions:", e);
      alert("An unexpected error occurred while preparing the review session.");
  }
}


// --- END OF FILE user.js ---
