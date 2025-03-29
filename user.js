// --- START OF FILE user.js ---

// Session tracking
let questionStartTime = 0;
let sessionStartTime = Date.now();

// Fetch already answered questions from Firestore
async function fetchPersistentAnsweredIds() {
  // Ensure dependencies are loaded
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) {
    console.error("System not ready for fetchPersistentAnsweredIds (Firebase missing).");
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
   // Ensure dependencies are loaded
   if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction || !window.getDoc || typeof calculateLevel !== 'function' || typeof updateUserXP !== 'function' || typeof updateUserMenu !== 'function' || typeof initializeDashboard !== 'function' || typeof showLevelUpAnimation !== 'function' ) {
    console.error("System not ready to record answer (dependencies missing).");
    return;
  }


  const uid = window.auth.currentUser.uid;
  const userDocRef = window.doc(window.db, 'users', uid);

  try {
    let levelUp = false;
    let newLevel = 0;
    let totalXP = 0;

    await window.runTransaction(window.db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      let data = userDoc.exists() ? userDoc.data() : {};

      // Initialize stats if needed, ensuring nested objects
      data.stats = data.stats ?? {};
      data.stats.xp = data.stats.xp ?? 0;
      data.stats.level = data.stats.level ?? 1;
      data.stats.achievements = data.stats.achievements ?? {};
      data.stats.currentCorrectStreak = data.stats.currentCorrectStreak ?? 0;
      data.stats.categories = data.stats.categories ?? {};
      data.stats.totalAnswered = data.stats.totalAnswered ?? 0;
      data.stats.totalCorrect = data.stats.totalCorrect ?? 0;
      data.stats.totalIncorrect = data.stats.totalIncorrect ?? 0;
      data.stats.totalTimeSpent = data.stats.totalTimeSpent ?? 0;

      data.answeredQuestions = data.answeredQuestions ?? {};
      data.streaks = data.streaks ?? { lastAnsweredDate: null, currentStreak: 0, longestStreak: 0 };


      // --- Streak Update Logic ---
      const currentDate = new Date();
      const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const normalizedCurrent = normalizeDate(currentDate);
      let streakUpdated = false;

      if (data.streaks.lastAnsweredDate) {
         try {
            const lastDate = new Date(data.streaks.lastAnsweredDate);
            if (!isNaN(lastDate.getTime())) {
                const normalizedLast = normalizeDate(lastDate);
                const diffDays = Math.round((normalizedCurrent - normalizedLast) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    data.streaks.currentStreak = (data.streaks.currentStreak || 0) + 1; streakUpdated = true;
                } else if (diffDays > 1) {
                    data.streaks.currentStreak = 1; streakUpdated = true; // Reset
                } // else diffDays is 0 or negative, don't change streak count
            } else { // Handle invalid stored date
                 data.streaks.currentStreak = 1; streakUpdated = true;
            }
         } catch(e) { // Catch parsing errors
              console.error("Error parsing streak date:", e); data.streaks.currentStreak = 1; streakUpdated = true;
         }
      } else { // No previous date
        data.streaks.currentStreak = 1; streakUpdated = true;
      }
      // Always update last answered date and longest streak
      data.streaks.lastAnsweredDate = currentDate.toISOString();
      data.streaks.longestStreak = Math.max(data.streaks.longestStreak || 0, data.streaks.currentStreak);
      // --- End Streak Update ---


       // Check if already answered (after streak update, before stats/XP)
       if (data.answeredQuestions[questionId]) {
           console.log(`Question ${questionId} previously answered. Updating streak only.`);
           transaction.set(userDocRef, { streaks: data.streaks }, { merge: true }); // Only save streak changes
           return; // Skip stats/XP/level updates
       }

      // --- Record Answer Details ---
      const currentTimestamp = currentDate.getTime();
      const currentFormatted = currentDate.toLocaleString();
      data.answeredQuestions[questionId] = {
        isCorrect, category, timestamp: currentTimestamp, timestampFormatted: currentFormatted, timeSpent
      };

      // Update consecutive streak
      data.stats.currentCorrectStreak = isCorrect ? (data.stats.currentCorrectStreak + 1) : 0;

      // Update basic stats
      data.stats.totalAnswered++;
      if (isCorrect) data.stats.totalCorrect++; else data.stats.totalIncorrect++;
      data.stats.totalTimeSpent += timeSpent;

      // Update category stats
      if (!data.stats.categories[category]) {
        data.stats.categories[category] = { answered: 0, correct: 0, incorrect: 0 };
      }
      const catStats = data.stats.categories[category];
      catStats.answered++;
      if (isCorrect) catStats.correct++; else catStats.incorrect++;


      // --- XP Calculation ---
      let earnedXP = 1 + (isCorrect ? 2 : 0);
      let bonusXP = 0;
      let bonusMessages = [];
      const achievements = data.stats.achievements;
      const currentStreak = data.streaks.currentStreak;
      const totalCorrect = data.stats.totalCorrect;
      const consecutiveCorrect = data.stats.currentCorrectStreak;

      // One-time Achievements
      if (data.stats.totalAnswered === 10 && !achievements.first10Questions) { bonusXP += 50; bonusMessages.push("First 10 questions: +50 XP"); achievements.first10Questions = true; }
      if (currentStreak === 7 && !achievements.first7DayStreak) { bonusXP += 50; bonusMessages.push("First 7-day streak: +50 XP"); achievements.first7DayStreak = true; }
      if (consecutiveCorrect === 5 && !achievements.first5Correct) { bonusXP += 20; bonusMessages.push("First 5 correct row: +20 XP"); achievements.first5Correct = true; }

      // Repeatable Streak Bonuses (only on day streak increases)
      if (streakUpdated) {
          const streakMilestones = { 3: 5, 7: 15, 14: 30, 30: 75, 60: 150, 100: 500 };
          if (streakMilestones[currentStreak]) { bonusXP += streakMilestones[currentStreak]; bonusMessages.push(`${currentStreak}-day streak: +${streakMilestones[currentStreak]} XP`); }
      }
      // Repeatable Correct Answer Milestones
       if (isCorrect) {
          const correctMilestones = { 10: 10, 25: 25, 50: 75, 100: 100, 200: 150 }; // Example
          if (correctMilestones[totalCorrect]) { bonusXP += correctMilestones[totalCorrect]; bonusMessages.push(`${totalCorrect} correct: +${correctMilestones[totalCorrect]} XP`); }
      }
      // Repeatable Consecutive Correct Bonuses
       const consecutiveMilestones = { 5: 10, 10: 25, 20: 75, 30: 125 }; // Example
       if (consecutiveMilestones[consecutiveCorrect]) { bonusXP += consecutiveMilestones[consecutiveCorrect]; bonusMessages.push(`${consecutiveCorrect} correct row: +${consecutiveMilestones[consecutiveCorrect]} XP`); }


      // Final XP Update
      data.stats.xp += (earnedXP + bonusXP);
      totalXP = data.stats.xp; // For level up check
      data.stats.lastBonusMessages = bonusMessages.length > 0 ? bonusMessages : null;

      // Level Update
      const oldLevel = data.stats.level;
      newLevel = calculateLevel(data.stats.xp);
      if (newLevel > oldLevel) {
        levelUp = true;
        data.stats.level = newLevel;
      }

      // Save all changes
      transaction.set(userDocRef, data, { merge: true });
    }); // End transaction

    console.log(`Answer processed for ${questionId}. XP: ${totalXP}, Level: ${newLevel}, LevelUp: ${levelUp}`);

    // Update UI after successful transaction
    updateUserXP(); // Ensure this function updates all relevant UI parts
    updateUserMenu();
    initializeDashboard(); // Refresh dashboard view

    if (levelUp) {
      setTimeout(() => showLevelUpAnimation(newLevel, totalXP), 500); // Delay slightly
    }

  } catch (error) {
    console.error("Error recording answer transaction:", error);
  }
}


// Calculate level based on XP thresholds
function calculateLevel(xp) {
  const levelThresholds = [0, 30, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000, 2750, 3750, 5000, 6500];
  let level = 1;
  for (let i = 1; i < levelThresholds.length; i++) {
    if (xp >= levelThresholds[i]) level = i + 1; else break;
  }
  return level;
}

// Calculate progress to next level (as percentage)
function calculateLevelProgress(xp) {
  const levelThresholds = [0, 30, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000, 2750, 3750, 5000, 6500];
  const level = calculateLevel(xp);
  if (level >= levelThresholds.length) return 100;
  const currentLevelXp = levelThresholds[level - 1];
  const nextLevelXp = levelThresholds[level];
  if (nextLevelXp === currentLevelXp) return 100; // Avoid division by zero if thresholds are same
  const xpInCurrentLevel = xp - currentLevelXp;
  const xpRequiredForNextLevel = nextLevelXp - currentLevelXp;
  return Math.min(100, Math.max(0, Math.floor((xpInCurrentLevel / xpRequiredForNextLevel) * 100)));
}

// XP info for a specific level
function getLevelInfo(level) {
  const levelThresholds = [0, 30, 75, 150, 250, 400, 600, 850, 1150, 1500, 2000, 2750, 3750, 5000, 6500];
  const actualLevel = Math.min(level, levelThresholds.length);
  const currentLevelXp = levelThresholds[actualLevel - 1] ?? levelThresholds[levelThresholds.length - 1];
  let nextLevelXp = (actualLevel < levelThresholds.length) ? levelThresholds[actualLevel] : null;
  return { currentLevelXp, nextLevelXp };
}

// Update question stats in Firestore (Separate collection)
async function updateQuestionStats(questionId, isCorrect) {
   if (!window.db || !window.doc || !window.runTransaction || !window.getDoc) {
    console.error("System not ready for updateQuestionStats (Firebase missing).");
    return;
  }
  if (!questionId) { console.error("updateQuestionStats: questionId is missing."); return; }

  // console.log("updateQuestionStats called for:", questionId, "isCorrect:", isCorrect); // Can be noisy
  const questionStatsRef = window.doc(window.db, "questionStats", questionId);
  try {
    await window.runTransaction(window.db, async (transaction) => {
      const statsDoc = await transaction.get(questionStatsRef);
      let statsData = statsDoc.exists() ? statsDoc.data() : {};
      // Ensure fields exist and are numbers
      statsData.totalAttempts = (statsData.totalAttempts || 0) + 1;
      if (isCorrect) {
        statsData.correctAttempts = (statsData.correctAttempts || 0) + 1;
      }
      transaction.set(questionStatsRef, statsData, { merge: true });
    });
    // console.log("Updated stats for question", questionId); // Can be noisy
  } catch (error) {
    console.error(`Error updating question stats for ${questionId}:`, error);
  }
}

// Update user XP display in UI elements
async function updateUserXP() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc || typeof calculateLevelProgress !== 'function' || typeof getLevelInfo !== 'function') {
    console.error("System not ready for updateUserXP (dependencies missing).");
    return;
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);

    let xp = 0, level = 1, progress = 0, lastBonusMessages = null; // Defaults

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      xp = data.stats?.xp || 0;
      level = data.stats?.level || 1;
      progress = calculateLevelProgress(xp);
      lastBonusMessages = data.stats?.lastBonusMessages;
    } else {
       console.warn("User document doesn't exist in updateUserXP - showing defaults.");
    }

    // Update UI elements safely
    const scoreCircle = document.getElementById("scoreCircle"); if (scoreCircle) scoreCircle.textContent = level;
    const xpDisplay = document.getElementById("xpDisplay"); if (xpDisplay) xpDisplay.textContent = `${xp} XP`;
    const userScoreCircle = document.getElementById("userScoreCircle"); if (userScoreCircle) userScoreCircle.textContent = level;
    const userXpDisplay = document.getElementById("userXpDisplay");
    if (userXpDisplay) {
        const levelInfo = getLevelInfo(level);
        userXpDisplay.textContent = (levelInfo.nextLevelXp !== null) ? `${xp}/${levelInfo.nextLevelXp} XP` : `${xp} XP (Max Lvl)`;
    }

    // Update Progress Visuals
    if (typeof updateLevelProgress === 'function') { updateLevelProgress(progress); }
    else { console.warn("updateLevelProgress function not found"); }

    // Handle Bonus Messages
    const notificationsContainer = document.getElementById("xpNotifications");
    const notificationsExist = notificationsContainer && notificationsContainer.children.length > 0;
    if (lastBonusMessages && Array.isArray(lastBonusMessages) && lastBonusMessages.length > 0 && !notificationsExist) {
        if (typeof showBonusMessages === 'function') showBonusMessages(lastBonusMessages);
        else console.warn("showBonusMessages function not found");

        // Clear messages in Firestore
        if (window.runTransaction) {
            await window.runTransaction(window.db, async (transaction) => {
                const latestUserDoc = await transaction.get(userDocRef);
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

  } catch (error) {
    console.error("Error updating user XP display:", error);
  }
}


// Show bonus messages as notifications
function showBonusMessages(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) return;

  let notificationContainer = document.getElementById("xpNotifications");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "xpNotifications";
    Object.assign(notificationContainer.style, {
      position: "fixed", top: "70px", right: "20px", zIndex: "9999",
      display: 'flex', flexDirection: 'column', gap: '10px'
    });
    document.body.appendChild(notificationContainer);
  }

  const createNotification = (message, index) => {
    const notification = document.createElement("div");
    notification.className = "xp-notification"; // For potential CSS styling
    notification.innerHTML = `<div class="xp-icon" style="margin-right: 10px; font-size: 1.3rem; line-height: 1;">✨</div><div style="line-height: 1.3;">${message}</div>`;
    Object.assign(notification.style, {
      backgroundColor: "rgba(0, 86, 179, 0.9)", // Slightly transparent blue
      color: "white", padding: "10px 15px", borderRadius: "6px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.2)", display: "flex",
      alignItems: "center", opacity: "0", maxWidth: "300px", // Limit width
      transform: "translateX(100%)", // Start off-screen right
      transition: "opacity 0.4s ease-out, transform 0.4s ease-out"
    });
    notificationContainer.appendChild(notification);

    // Animate in
    setTimeout(() => { notification.style.opacity = "1"; notification.style.transform = "translateX(0)"; }, 50 + 100 * index);

    // Schedule removal
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
         if (notification.parentNode) notification.remove(); // Check if still attached
         if (notificationContainer && notificationContainer.children.length === 0) {
             notificationContainer.remove(); // Clean up container if empty
         }
     }, 400); // Matches transition duration
    }, 4500 + 100 * index); // Show for ~4.5 seconds, staggered
  };
  messages.forEach(createNotification);
}


// Update the user menu with current username and score
async function updateUserMenu() {
  if (!window.auth || !window.auth.currentUser) {
    console.log("Auth not initialized for updateUserMenu"); return;
  }
  // Check dependencies
  if (typeof getOrGenerateUsername !== 'function' || typeof updateUserXP !== 'function') {
     console.error("updateUserMenu dependencies missing (getOrGenerateUsername or updateUserXP)"); return;
  }

  try {
    const username = await getOrGenerateUsername(); // Fetch/generate username
    const usernameDisplay = document.getElementById("usernameDisplay");
    if (usernameDisplay) {
      usernameDisplay.textContent = username;
    } else {
       console.warn("usernameDisplay element not found in user menu.");
    }
    await updateUserXP(); // Update XP/Level display in the menu
  } catch (error) {
    console.error("Error updating user menu:", error);
  }
}

// Get or generate a username
async function getOrGenerateUsername() {
  // Check dependencies first
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc || !window.runTransaction || typeof generateRandomName !== 'function') {
    console.warn("System not ready for getOrGenerateUsername.");
    return "Guest";
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);

    if (userDocSnap.exists() && userDocSnap.data().username) {
      return userDocSnap.data().username; // Username exists, return it
    } else {
      // Username doesn't exist, need to generate and save
      const newUsername = generateRandomName();
      console.log(`Generating username for ${uid}: ${newUsername}`);
      try {
          await window.runTransaction(window.db, async (transaction) => {
              const docInTransaction = await transaction.get(userDocRef);
              let data = docInTransaction.exists() ? docInTransaction.data() : {};
              // Only set if username is missing/falsy to prevent overwriting
              if (!data.username) {
                  data.username = newUsername;
                  transaction.set(userDocRef, data, { merge: true }); // Use merge:true to add username without overwriting other fields
              } else {
                  // If username magically appeared between getDoc and transaction, use the existing one
                  console.log("Username already exists in transaction, using that instead.");
                  return data.username;
              }
          });
          return newUsername; // Return generated name after successful transaction
      } catch (transactionError) {
          console.error("Transaction failed in getOrGenerateUsername:", transactionError);
          // Fallback: return generated name, hoping it gets saved later, or default
          return newUsername; // Or return "Guest Error"
      }
    }
  } catch (error) {
      console.error("Error getting/generating username:", error);
      return "Guest Error"; // Indicate an error occurred
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
    console.warn("System not ready for getBookmarks."); return [];
  }
  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    return userDocSnap.exists() ? (userDocSnap.data().bookmarks || []) : [];
  } catch (error) {
    console.error("Error getting bookmarks:", error); return [];
  }
}

// Toggle a bookmark (add if not present, remove if present)
async function toggleBookmark(questionId) {
   if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction || !window.getDoc) {
    console.error("System not ready for toggleBookmark."); return false;
  }
  if (!questionId || typeof questionId !== 'string' || questionId.trim() === '') {
     console.error("Invalid questionId provided to toggleBookmark."); return false;
  }

  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    let isNowBookmarked = false; // Track the final state

    await window.runTransaction(window.db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      let data = userDoc.exists() ? userDoc.data() : {};
      let bookmarks = data.bookmarks || [];
      const index = bookmarks.indexOf(questionId);

      if (index === -1) { bookmarks.push(questionId); isNowBookmarked = true; }
      else { bookmarks.splice(index, 1); isNowBookmarked = false; }

      transaction.set(userDocRef, { bookmarks: bookmarks }, { merge: true });
    });

    // Update UI immediately
    const currentSlide = document.querySelector(`.swiper-slide[data-id="${questionId}"]`);
    if (currentSlide) currentSlide.dataset.bookmarked = isNowBookmarked ? "true" : "false";
    const favoriteButton = document.getElementById("favoriteButton");
    const currentVisibleQuestionId = typeof getCurrentQuestionId === 'function' ? getCurrentQuestionId() : null;
    if (favoriteButton && currentVisibleQuestionId === questionId) {
         favoriteButton.innerText = isNowBookmarked ? "★" : "☆";
         favoriteButton.style.color = isNowBookmarked ? "#007BFF" : "";
    }
    return isNowBookmarked;

  } catch (error) {
    console.error("Error toggling bookmark:", error); return false;
  }
}


// Function to show the level-up modal and animation
function showLevelUpAnimation(newLevel, totalXP) {
   let modal = document.getElementById('levelUpModal');
   if (!modal) { // Create modal if it doesn't exist
       modal = document.createElement('div'); modal.id = 'levelUpModal';
       modal.innerHTML = `<div id="levelUpContent"><div id="levelUpHeader"><h2 id="levelUpTitle">LEVEL UP!</h2></div><div id="levelUpBadge"><span id="levelNumber"></span></div><div id="levelUpBody"><p id="levelUpMessage"></p><p id="levelUpXP"></p><button id="levelUpButton">Continue</button></div></div>`;
       document.body.appendChild(modal);
       const closeButton = document.getElementById('levelUpButton');
       if (closeButton) closeButton.addEventListener('click', hideLevelUpModal);
       else console.error("Could not find level up close button.");
   }

   // Update content safely
   const levelNumberEl = document.getElementById('levelNumber'); if (levelNumberEl) levelNumberEl.textContent = newLevel;
   const levelUpXPEl = document.getElementById('levelUpXP'); if (levelUpXPEl) levelUpXPEl.textContent = `Total XP: ${totalXP}`;
   const levelUpMessageEl = document.getElementById('levelUpMessage');
   if(levelUpMessageEl) {
       let message = "Congratulations! Keep up the good work!";
       if (newLevel >= 10) message = "Amazing progress! Elite level!"; else if (newLevel >= 5) message = "Great job! Becoming a master!";
       levelUpMessageEl.textContent = message;
   }

   // Show modal and animate
   modal.style.display = 'flex';
   requestAnimationFrame(() => { requestAnimationFrame(() => { modal.style.opacity = '1'; }); }); // Fade in

   if (typeof createConfetti === 'function') createConfetti(); // Add confetti effect

   // Play sound
   if (window.Audio) { try { const s = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_c4b035d4a7.mp3?filename=level-up-arcade-6442.mp3'); s.volume = 0.4; s.play().catch(e=>console.warn("Audio play failed:", e)); } catch (e) { console.error("Audio init failed", e); }}
}

// Function to hide the level-up modal
function hideLevelUpModal() {
  const modal = document.getElementById('levelUpModal');
  if (modal) { modal.style.opacity = '0'; setTimeout(() => { modal.style.display = 'none'; }, 300); }
}

// Function to create confetti effect for level up
function createConfetti() {
   const modalContent = document.getElementById('levelUpContent'); // Target content div
   if (!modalContent) return;

   // Create a container *inside* the modal content for confetti
   let confettiContainer = modalContent.querySelector('.confetti-container');
   if (!confettiContainer) {
      confettiContainer = document.createElement('div');
      confettiContainer.className = 'confetti-container';
      Object.assign(confettiContainer.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none', zIndex: '5' });
      modalContent.insertBefore(confettiContainer, modalContent.firstChild); // Insert at the beginning
   } else {
      confettiContainer.innerHTML = ''; // Clear previous confetti
   }

   const colors = ['#FFC700', '#FF3D00', '#00C853', '#2979FF', '#AA00FF', '#D500F9'];
   const confettiCount = 60; // More confetti!

   for (let i = 0; i < confettiCount; i++) {
       const confetti = document.createElement('div');
       const size = 6 + Math.random() * 6; // Slightly larger range
       Object.assign(confetti.style, {
           position: 'absolute', width: `${size}px`, height: `${size}px`,
           backgroundColor: colors[Math.floor(Math.random() * colors.length)],
           borderRadius: `${Math.random() * 50}%`, // More varied shapes
           left: `${Math.random() * 100}%`, top: `${-10 - Math.random() * 20}%`, // Start higher up
           opacity: '1', transform: `rotate(${Math.random() * 360}deg)`,
           animation: `confettiFall ${1.8 + Math.random() * 1.2}s ${Math.random() * 0.6}s linear forwards` // Longer duration, varied delay
       });
       confettiContainer.appendChild(confetti);
   }
   // Clean up container later
   setTimeout(() => { if (confettiContainer.parentNode) confettiContainer.remove(); }, 3000); // Increased timeout
}

// Spaced Repetition Data Update
async function updateSpacedRepetitionData(questionId, isCorrect, difficulty, nextReviewInterval) {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction) { console.error("System not ready for SR update."); return; }
  if (!questionId) { console.error("Invalid questionId for SR update."); return ; }

  const uid = window.auth.currentUser.uid;
  const userDocRef = window.doc(window.db, 'users', uid);
  try {
    await window.runTransaction(window.db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      let data = userDoc.exists() ? userDoc.data() : {};
      data.spacedRepetition = data.spacedRepetition || {};
      const now = new Date(); const nextReviewDate = new Date();
      const intervalDays = (typeof nextReviewInterval === 'number' && nextReviewInterval > 0) ? nextReviewInterval : 1;
      nextReviewDate.setDate(now.getDate() + intervalDays);
      const currentReviewCount = data.spacedRepetition[questionId]?.reviewCount || 0;
      data.spacedRepetition[questionId] = {
        lastReviewedAt: now.toISOString(), nextReviewDate: nextReviewDate.toISOString(),
        reviewInterval: intervalDays, difficulty: difficulty,
        lastResult: isCorrect ? 'correct' : 'incorrect', reviewCount: currentReviewCount + 1
      };
      transaction.set(userDocRef, data, { merge: true });
    });
    console.log(`SR data updated for Q ${questionId}`);
    if(typeof updateReviewQueue === 'function') updateReviewQueue(); // Refresh queue display
  } catch (error) { console.error("Error updating SR data:", error); }
}
window.updateSpacedRepetitionData = updateSpacedRepetitionData; // Ensure global access if needed


// Fetch Spaced Repetition Data
async function fetchSpacedRepetitionData() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) { console.warn("System not ready for fetchSRData."); return {}; }
  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    return userDocSnap.exists() ? (userDocSnap.data().spacedRepetition || {}) : {};
  } catch (error) { console.error("Error fetching SR data:", error); return {}; }
}
window.fetchSpacedRepetitionData = fetchSpacedRepetitionData; // Ensure global access


// ==============================================================
// == DASHBOARD INITIALIZATION & EVENT SETUP (DEFINITIONS) ==
// ==============================================================

// Dashboard initialization
async function initializeDashboard() {
    const mainOptions = document.getElementById("mainOptions");
    if (!mainOptions || mainOptions.style.display === 'none') {
        // console.log("Dashboard not visible, skipping initialization."); // Can be noisy
        return;
    }
    console.log("Initializing dashboard UI...");

    if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc || typeof calculateLevelProgress !== 'function' || typeof getLevelInfo !== 'function' || typeof fixStreakCalendar !== 'function' || typeof loadLeaderboardPreview !== 'function' || typeof updateReviewQueue !== 'function') {
        console.error("Dashboard initialization failed: Missing dependencies (Auth/DB or helper functions).");
        // Optionally display an error state on the dashboard
        const dashboardContainer = document.querySelector(".dashboard-container");
        if(dashboardContainer) dashboardContainer.innerHTML = "<p style='color:red; text-align:center;'>Error loading dashboard data.</p>";
        return;
    }

    // Wrap core logic in requestAnimationFrame to ensure DOM is ready after display change
    requestAnimationFrame(async () => {
        try {
            const uid = window.auth.currentUser.uid;
            const userDocRef = window.doc(window.db, 'users', uid);
            const userDocSnap = await window.getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                const stats = data.stats || {};
                const streaks = data.streaks || { currentStreak: 0 };

                // --- Update Level & XP Card ---
                const xp = stats.xp || 0; const level = stats.level || 1;
                const progress = calculateLevelProgress(xp);
                const levelInfo = getLevelInfo(level);
                const nextLevelText = (levelInfo.nextLevelXp !== null) ? `${levelInfo.nextLevelXp - xp} XP to Level ${level + 1}` : 'Max Level!';

                document.getElementById("dashboardLevel")?.textContent = level;
                document.getElementById("dashboardXP")?.textContent = `${xp} XP`;
                document.getElementById("dashboardNextLevel")?.textContent = nextLevelText;
                document.getElementById("dashboardLevelProgress")?.style.setProperty('--progress', `${progress}%`);

                // --- Update Quick Stats Card ---
                const totalAnswered = stats.totalAnswered || 0; const totalCorrect = stats.totalCorrect || 0;
                const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
                document.getElementById("dashboardAnswered")?.textContent = totalAnswered;
                document.getElementById("dashboardAccuracy")?.textContent = `${accuracy}%`;

                // --- Update Streak Card ---
                document.getElementById("currentStreak")?.textContent = streaks.currentStreak || 0;
                fixStreakCalendar(streaks); // Update calendar visual

                // --- Load Previews ---
                loadLeaderboardPreview(); // Assumes function handles its own errors/loading state
                updateReviewQueue();      // Assumes function handles its own errors/loading state

                console.log("Dashboard UI updated successfully.");

            } else {
                 console.warn(`User document (${uid}) does not exist during dashboard init.`);
                 // Set UI to default state for a new user
                 document.getElementById("dashboardLevel")?.textContent = 1;
                 document.getElementById("dashboardXP")?.textContent = `0 XP`;
                 document.getElementById("dashboardNextLevel")?.textContent = `${getLevelInfo(1).nextLevelXp} XP to Level 2`;
                 document.getElementById("dashboardLevelProgress")?.style.setProperty('--progress', `0%`);
                 document.getElementById("dashboardAnswered")?.textContent = 0;
                 document.getElementById("dashboardAccuracy")?.textContent = `0%`;
                 document.getElementById("currentStreak")?.textContent = 0;
                 fixStreakCalendar({}); // Empty streak data
                 loadLeaderboardPreview(); // Still try to load leaderboard (might show them at bottom)
                 updateReviewQueue();      // Will show empty state
            }
        } catch (error) {
            console.error("Error during dashboard data fetch/update:", error);
            const dashboardContainer = document.querySelector(".dashboard-container");
            if(dashboardContainer) dashboardContainer.innerHTML = "<p style='color:red; text-align:center;'>Failed to load dashboard. Please refresh.</p>";
        }
    }); // End requestAnimationFrame
}


// Set up event listeners for dashboard
function setupDashboardEvents() {
    // Ensure this runs only once after the dashboard is potentially visible
    // requestAnimationFrame helps ensure the elements are likely available
    requestAnimationFrame(() => {
        console.log("Setting up dashboard event listeners...");

        // --- Helper ---
        const addClickListenerOnce = (id, handler) => {
            const element = document.getElementById(id);
            if (element) {
                if (!element._dashboardListenerAttached) { // Use a specific flag
                    element.addEventListener('click', handler);
                    element._dashboardListenerAttached = true;
                     // console.log(`Dashboard listener attached to #${id}`); // Less noise
                }
            } else {
                console.warn(`Dashboard element #${id} not found for listener.`);
            }
        };

        // --- Attach Listeners ---
        addClickListenerOnce("startQuizBtn", () => {
            document.getElementById("quizSetupModal")?.style.display = "block";
        });
        addClickListenerOnce("modalStartQuiz", () => {
            const category = document.getElementById("modalCategorySelect")?.value || "";
            const numQ = parseInt(document.getElementById("modalNumQuestions")?.value) || 10;
            const includeAns = document.getElementById("modalIncludeAnswered")?.checked || false;
            const useSR = document.getElementById("modalSpacedRepetition")?.checked || false;
            document.getElementById("quizSetupModal")?.style.display = "none";
            if (typeof loadQuestions === 'function') loadQuestions({ type: category ? 'custom' : 'random', category, num: numQ, includeAnswered: includeAns, spacedRepetition: useSR });
            else console.error("loadQuestions function missing!");
        });
        addClickListenerOnce("modalCancelQuiz", () => {
            document.getElementById("quizSetupModal")?.style.display = "none";
        });
        addClickListenerOnce("userProgressCard", () => {
            if (typeof displayPerformance === 'function') displayPerformance(); else console.error("displayPerformance missing!");
        });
        addClickListenerOnce("quickStatsCard", () => {
            if (typeof displayPerformance === 'function') displayPerformance(); else console.error("displayPerformance missing!");
        });
        addClickListenerOnce("leaderboardPreviewCard", () => {
            if (typeof showLeaderboard === 'function') showLeaderboard(); else console.error("showLeaderboard missing!");
        });
        addClickListenerOnce("reviewQueueCard", async () => {
            if(typeof countDueReviews !== 'function' || typeof getDueQuestionIds !== 'function' || typeof loadSpecificQuestions !== 'function') { console.error("Review functions missing!"); return; }
            try {
                const { dueCount } = await countDueReviews();
                if (dueCount === 0) { alert("No questions due for review today!"); return; }
                const ids = await getDueQuestionIds();
                if (ids.length === 0) { alert("Could not retrieve review questions."); return; }
                loadSpecificQuestions(ids);
            } catch (error) { console.error("Error starting review session:", error); alert("Error starting review."); }
        });

         console.log("Dashboard listeners setup complete.");
    }); // End requestAnimationFrame
}

// Function to load leaderboard preview data
async function loadLeaderboardPreview() {
  const leaderboardPreview = document.getElementById("leaderboardPreview");
  if (!leaderboardPreview) return;

   // Ensure dependencies are available
  if (!window.auth || !window.auth.currentUser || !window.db || !window.getDocs || !window.collection) {
    console.warn("Leaderboard preview cannot load: System not ready.");
    leaderboardPreview.innerHTML = '<div class="leaderboard-loading">Loading...</div>'; // Show loading
    return;
  }

  leaderboardPreview.innerHTML = '<div class="leaderboard-loading">Loading...</div>';

  try {
    const currentUid = window.auth.currentUser.uid;
    // Fetch users collection ordered by XP descending, limit for performance if needed
    // Note: Firestore requires an index for composite queries (e.g., order by stats.xp)
    // If you haven't created one, this might be slow or error.
    // For simplicity here, we fetch all and sort client-side.
    const querySnapshot = await window.getDocs(window.collection(window.db, 'users'));
    let leaderboardEntries = [];

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      // Basic check for stats and xp existence
      if (data && data.stats && typeof data.stats.xp === 'number') {
        leaderboardEntries.push({
          uid: docSnap.id,
          username: data.username || "Anonymous", // Handle missing username
          xp: data.stats.xp
        });
      }
    });

    // Sort client-side
    leaderboardEntries.sort((a, b) => b.xp - a.xp);

    let top3 = leaderboardEntries.slice(0, 3);
    let currentUserRank = -1;
    let currentUserEntry = null;

    // Find current user's rank and entry efficiently
    for(let i = 0; i < leaderboardEntries.length; i++) {
        if(leaderboardEntries[i].uid === currentUid) {
            currentUserRank = i + 1;
            currentUserEntry = leaderboardEntries[i];
            break; // Stop searching once found
        }
    }
    let showCurrentUserSeparately = currentUserRank > 3 && currentUserEntry;

    // Build HTML
    let html = '';
    if (top3.length === 0) {
      html = '<div class="leaderboard-loading">Leaderboard is empty!</div>';
    } else {
      top3.forEach((entry, index) => {
        const isCurrentUser = entry.uid === currentUid;
        const rank = index + 1;
        const usernameDisplay = `${entry.username}${isCurrentUser ? ' (You)' : ''}`;
        html += `
          <div class="leaderboard-preview-entry ${isCurrentUser ? 'current-user-entry' : ''}">
            <div class="leaderboard-rank leaderboard-rank-${rank}">${rank}</div>
            <div class="leaderboard-user-info"><div class="leaderboard-username">${usernameDisplay}</div><div class="leaderboard-user-xp">${entry.xp} XP</div></div>
          </div>`;
      });
      if (showCurrentUserSeparately) {
        html += `
          <div class="leaderboard-preview-entry current-user-entry">
            <div class="leaderboard-rank">${currentUserRank}</div>
            <div class="leaderboard-user-info"><div class="leaderboard-username">${currentUserEntry.username} (You)</div><div class="leaderboard-user-xp">${currentUserEntry.xp} XP</div></div>
          </div>`;
      }
    }
    leaderboardPreview.innerHTML = html;

  } catch (error) {
    console.error("Error loading leaderboard preview:", error);
    leaderboardPreview.innerHTML = '<div class="leaderboard-loading" style="color: red;">Error loading</div>';
  }
}

// Function to update the Review Queue card in the dashboard
async function updateReviewQueue() {
  const reviewCountElement = document.getElementById("reviewCount");
  const reviewQueueContent = document.getElementById("reviewQueueContent");
  const reviewProgressBar = document.getElementById("reviewProgressBar");

  if (!reviewCountElement || !reviewQueueContent || !reviewProgressBar) {
     console.warn("Review queue UI elements not found."); return;
  }
  if (typeof countDueReviews !== 'function') {
     console.error("countDueReviews function not found for updateReviewQueue."); return;
  }

  // Set loading state? (Optional)
  // reviewCountElement.textContent = '...';

  try {
      const { dueCount, nextReviewDate } = await countDueReviews();

      reviewCountElement.textContent = dueCount; // Update count

      const reviewStatsDiv = reviewQueueContent.querySelector(".review-stats");
      const progressContainer = reviewQueueContent.querySelector(".review-progress-container");
      let emptyStateDiv = reviewQueueContent.querySelector(".review-empty-state"); // Use let

      if (dueCount > 0) {
          // Show stats/progress, hide empty state
          if (reviewStatsDiv) reviewStatsDiv.style.display = ''; // Reset display potentially set by empty state
          if (progressContainer) progressContainer.style.display = '';
          if (emptyStateDiv) emptyStateDiv.style.display = 'none';

          const progressPercent = Math.min(100, (dueCount / 20) * 100);
          reviewProgressBar.style.width = `${progressPercent}%`;

      } else {
          // Hide stats/progress, show empty state
          if (reviewStatsDiv) reviewStatsDiv.style.display = 'none';
          if (progressContainer) progressContainer.style.display = 'none';

          let emptyStateMessage = "No reviews scheduled. Keep learning!";
          if (nextReviewDate) {
              const today = new Date(); today.setHours(0,0,0,0);
              const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
              let formattedDate = (nextReviewDate.getTime() === tomorrow.getTime()) ? "Tomorrow"
                                 : nextReviewDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              emptyStateMessage = `Nothing due today!<br>Next review: <span class="next-review-date">${formattedDate}</span>`;
          }

          if (!emptyStateDiv) { // Create empty state div if it doesn't exist
             emptyStateDiv = document.createElement("div");
             emptyStateDiv.className = "review-empty-state";
             Object.assign(emptyStateDiv.style, { textAlign: 'center', color: '#666', fontSize: '0.9rem', padding: '10px 0', lineHeight: '1.4'});
             reviewQueueContent.appendChild(emptyStateDiv);
          }
           emptyStateDiv.innerHTML = emptyStateMessage;
           emptyStateDiv.style.display = 'block'; // Ensure it's visible
      }
  } catch (error) {
       console.error("Error updating review queue UI:", error);
       reviewCountElement.textContent = 'N/A'; // Show error indicator
       // Optionally display error in the card content
  }
}


// Function to fix streak calendar alignment
function fixStreakCalendar(streaksData) {
    const streakCalendar = document.getElementById("streakCalendar");
    if (!streakCalendar) { console.warn("Streak calendar element not found."); return; }

    streakCalendar.innerHTML = ''; // Clear existing

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let todayDayIndex = today.getDay() - 1; if (todayDayIndex < 0) todayDayIndex = 6; // 0=Mon, 6=Sun

    const currentStreak = streaksData?.currentStreak || 0;
    let lastAnsweredDate = null;
    if (streaksData?.lastAnsweredDate) {
       try {
          const parsed = new Date(streaksData.lastAnsweredDate);
          if (!isNaN(parsed.getTime())) { lastAnsweredDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()); }
       } catch(e) { console.error("Error parsing lastAnsweredDate in fixStreakCalendar:", e); }
    }

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - todayDayIndex); // Find the Monday of the current week

    for (let i = 0; i < 7; i++) { // Iterate Monday to Sunday
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);

        const dayCircle = document.createElement("div");
        dayCircle.className = "day-circle";
        dayCircle.textContent = date.getDate();

        if (date.getTime() === today.getTime()) {
            dayCircle.classList.add("today");
        }

        // Determine if day is active based on streak ending on *lastAnsweredDate*
        if (currentStreak > 0 && lastAnsweredDate) {
             // Calculate difference between the day being rendered and the last answered day
             const diffDays = Math.round((lastAnsweredDate - date) / (1000 * 60 * 60 * 24));
             // Day is active if it's within the streak range *before or on* the last answered day,
             // and not in the future relative to today.
             if (diffDays >= 0 && diffDays < currentStreak && date <= today) {
                 dayCircle.classList.add("active");
             }
        }
        streakCalendar.appendChild(dayCircle);
    }
}


// Function to get IDs of questions due for review
async function getDueQuestionIds() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) { console.warn("System not ready for getDueQuestionIds."); return []; }
  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    if (!userDocSnap.exists()) return [];
    const data = userDocSnap.data();
    const spacedRepetitionData = data.spacedRepetition || {};
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let dueQuestionIds = [];
    for (const questionId in spacedRepetitionData) {
      const reviewData = spacedRepetitionData[questionId];
      if (!reviewData || !reviewData.nextReviewDate) continue;
      try {
        const reviewDate = new Date(reviewData.nextReviewDate);
        if (isNaN(reviewDate.getTime())) continue;
        const reviewDateOnly = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
        if (reviewDateOnly <= today) dueQuestionIds.push(questionId);
      } catch (e) { console.warn(`Error processing date for Q ${questionId} in getDueQuestionIds:`, e); }
    }
    // console.log(`Found ${dueQuestionIds.length} questions due for review.`); // Less noise
    return dueQuestionIds;
  } catch (error) { console.error("Error getting due question IDs:", error); return []; }
}

// Function to load only specific questions by ID for review session
async function loadSpecificQuestions(questionIds) {
  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) { alert("No questions selected for review."); return; }
  console.log(`Starting review session with ${questionIds.length} specific questions.`);
  if (typeof Papa === 'undefined' || typeof csvUrl === 'undefined' || typeof shuffleArray !== 'function' || typeof initializeQuiz !== 'function') {
     console.error("Missing dependencies for loadSpecificQuestions."); alert("Error preparing review session."); return;
  }
  try {
    Papa.parse(csvUrl, {
      download: true, header: true, skipEmptyLines: true, // Added skip empty lines
      complete: function(results) {
        if (!results || !results.data || results.errors.length > 0) {
           console.error("CSV parsing failed:", results?.errors); alert("Error loading question data."); return;
        }
        const allQuestions = results.data;
        const reviewQuestions = allQuestions.filter(q => q && q["Question"] && questionIds.includes(q["Question"].trim()));
        console.log(`Found ${reviewQuestions.length} matching questions in bank.`);
        if (reviewQuestions.length === 0) {
          alert("Could not find the scheduled review questions in the current question bank.");
          const mainOptions = document.getElementById("mainOptions"); if(mainOptions) mainOptions.style.display = 'flex'; return;
        }
        const shuffledReviewQuestions = shuffleArray([...reviewQuestions]);
        initializeQuiz(shuffledReviewQuestions); // Initialize quiz with these questions
      },
      error: function(error) { console.error("Network/parsing error loading question bank:", error); alert("Error loading questions. Check connection."); }
    });
  } catch (e) { console.error("Unexpected error in loadSpecificQuestions:", e); alert("An unexpected error occurred starting the review."); }
}


// --- END OF FILE user.js ---
