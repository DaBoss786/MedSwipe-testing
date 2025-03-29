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
  if (level >= levelThresholds.length) return 100; // Max level
  const currentLevelXp = levelThresholds[level - 1];
  const nextLevelXp = levelThresholds[level];
  if (nextLevelXp <= currentLevelXp) return 100; // Avoid division by zero or negative if thresholds are weird
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
    console.error("System not ready for updateQuestionStats (Firebase missing)."); return;
  }
  if (!questionId) { console.error("updateQuestionStats: questionId is missing."); return; }

  const questionStatsRef = window.doc(window.db, "questionStats", questionId);
  try {
    await window.runTransaction(window.db, async (transaction) => {
      const statsDoc = await transaction.get(questionStatsRef);
      let statsData = statsDoc.exists() ? statsDoc.data() : {};
      statsData.totalAttempts = (statsData.totalAttempts || 0) + 1;
      if (isCorrect) statsData.correctAttempts = (statsData.correctAttempts || 0) + 1;
      transaction.set(questionStatsRef, statsData, { merge: true });
    });
  } catch (error) {
    console.error(`Error updating question stats for ${questionId}:`, error);
  }
}

// Update user XP display in UI elements
async function updateUserXP() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc || typeof calculateLevelProgress !== 'function' || typeof getLevelInfo !== 'function') {
    console.error("System not ready for updateUserXP (dependencies missing)."); return;
  }
  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    let xp = 0, level = 1, progress = 0, lastBonusMessages = null;

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      xp = data.stats?.xp ?? 0; // Use nullish coalescing
      level = data.stats?.level ?? 1;
      progress = calculateLevelProgress(xp);
      lastBonusMessages = data.stats?.lastBonusMessages;
    } else { console.warn("User document missing in updateUserXP."); }

    // Update UI
    document.getElementById("scoreCircle")?.textContent = level;
    document.getElementById("xpDisplay")?.textContent = `${xp} XP`;
    document.getElementById("userScoreCircle")?.textContent = level;
    const userXpDisplay = document.getElementById("userXpDisplay");
    if (userXpDisplay) { const li = getLevelInfo(level); userXpDisplay.textContent = (li.nextLevelXp !== null) ? `${xp}/${li.nextLevelXp} XP` : `${xp} XP (Max Lvl)`; }
    if (typeof updateLevelProgress === 'function') updateLevelProgress(progress); else console.warn("updateLevelProgress func missing.");

    // Handle Bonus Messages
    const notificationsContainer = document.getElementById("xpNotifications");
    const notificationsExist = notificationsContainer && notificationsContainer.children.length > 0;
    if (lastBonusMessages && Array.isArray(lastBonusMessages) && lastBonusMessages.length > 0 && !notificationsExist) {
        if (typeof showBonusMessages === 'function') showBonusMessages(lastBonusMessages); else console.warn("showBonusMessages func missing.");
        // Clear messages
        if (window.runTransaction) {
            await window.runTransaction(window.db, async (t) => { const d = await t.get(userDocRef); if (d.exists()) { const u = d.data(); if (u.stats) { u.stats.lastBonusMessages = null; t.set(userDocRef, u, { merge: true }); } } }).catch(e => console.error("Error clearing bonus msg:", e));
        }
    }
  } catch (error) { console.error("Error updating user XP display:", error); }
}


// Show bonus messages as notifications
function showBonusMessages(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) return;
  let notificationContainer = document.getElementById("xpNotifications");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div"); notificationContainer.id = "xpNotifications";
    Object.assign(notificationContainer.style, { position: "fixed", top: "70px", right: "20px", zIndex: "9999", display: 'flex', flexDirection: 'column', gap: '10px' });
    document.body.appendChild(notificationContainer);
  }
  const createNotification = (message, index) => {
    const notification = document.createElement("div"); notification.className = "xp-notification";
    notification.innerHTML = `<div class="xp-icon" style="margin-right: 10px; font-size: 1.3rem; line-height: 1;">✨</div><div style="line-height: 1.3;">${message}</div>`;
    Object.assign(notification.style, { backgroundColor: "rgba(0, 86, 179, 0.9)", color: "white", padding: "10px 15px", borderRadius: "6px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", opacity: "0", maxWidth: "300px", transform: "translateX(100%)", transition: "opacity 0.4s ease-out, transform 0.4s ease-out" });
    notificationContainer.appendChild(notification);
    setTimeout(() => { notification.style.opacity = "1"; notification.style.transform = "translateX(0)"; }, 50 + 100 * index);
    setTimeout(() => { notification.style.opacity = "0"; notification.style.transform = "translateX(100%)"; setTimeout(() => { if (notification.parentNode) notification.remove(); if (notificationContainer && notificationContainer.children.length === 0) notificationContainer.remove(); }, 400); }, 4500 + 100 * index);
  };
  messages.forEach(createNotification);
}


// Update the user menu with current username and score
async function updateUserMenu() {
  if (!window.auth || !window.auth.currentUser) { console.warn("Auth not ready for updateUserMenu."); return; }
  if (typeof getOrGenerateUsername !== 'function' || typeof updateUserXP !== 'function') { console.error("updateUserMenu dependencies missing."); return; }
  try {
    const username = await getOrGenerateUsername();
    const usernameDisplay = document.getElementById("usernameDisplay");
    if (usernameDisplay) usernameDisplay.textContent = username; else console.warn("usernameDisplay element missing.");
    await updateUserXP(); // Refresh XP/Level in menu
  } catch (error) { console.error("Error updating user menu:", error); }
}

// Get or generate a username
async function getOrGenerateUsername() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc || !window.runTransaction || typeof generateRandomName !== 'function') {
    console.warn("System not ready for getOrGenerateUsername."); return "Guest";
  }
  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    if (userDocSnap.exists() && userDocSnap.data().username) {
      return userDocSnap.data().username;
    } else {
      const newUsername = generateRandomName();
      console.log(`Generating username for ${uid}: ${newUsername}`);
      try {
          await window.runTransaction(window.db, async (transaction) => {
              const docInTransaction = await transaction.get(userDocRef);
              let data = docInTransaction.exists() ? docInTransaction.data() : {};
              if (!data.username) { data.username = newUsername; transaction.set(userDocRef, data, { merge: true }); }
              else { return data.username; } // Return existing if found during transaction
          });
          return newUsername; // Return generated name
      } catch (transactionError) {
          console.error("Transaction failed in getOrGenerateUsername:", transactionError); return newUsername; // Fallback
      }
    }
  } catch (error) { console.error("Error getting/generating username:", error); return "Guest Error"; }
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

// Bookmark functions
async function getBookmarks() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) { console.warn("System not ready for getBookmarks."); return []; }
  try { const uid = window.auth.currentUser.uid; const d = await window.getDoc(window.doc(window.db, 'users', uid)); return d.exists() ? (d.data().bookmarks || []) : []; } catch (e) { console.error("Error getting bookmarks:", e); return []; }
}
async function toggleBookmark(questionId) {
   if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction || !window.getDoc) { console.error("System not ready for toggleBookmark."); return false; }
   if (!questionId || typeof questionId !== 'string' || questionId.trim() === '') { console.error("Invalid questionId for toggleBookmark."); return false; }
  try {
    const uid = window.auth.currentUser.uid; const ref = window.doc(window.db, 'users', uid); let isBookmarked = false;
    await window.runTransaction(window.db, async (t) => { const d = await t.get(ref); let data = d.exists() ? d.data() : {}; let b = data.bookmarks || []; const i = b.indexOf(questionId); if (i === -1) { b.push(questionId); isBookmarked = true; } else { b.splice(i, 1); isBookmarked = false; } t.set(ref, { bookmarks: b }, { merge: true }); });
    const slide = document.querySelector(`.swiper-slide[data-id="${questionId}"]`); if (slide) slide.dataset.bookmarked = isBookmarked ? "true" : "false";
    const favBtn = document.getElementById("favoriteButton"); const currentQId = typeof getCurrentQuestionId === 'function' ? getCurrentQuestionId() : null; if (favBtn && currentQId === questionId) { favBtn.innerText = isBookmarked ? "★" : "☆"; favBtn.style.color = isBookmarked ? "#007BFF" : ""; }
    return isBookmarked;
  } catch (e) { console.error("Error toggling bookmark:", e); return false; }
}

// Level Up Modal Functions
function showLevelUpAnimation(newLevel, totalXP) {
   let modal = document.getElementById('levelUpModal');
   if (!modal) { modal = document.createElement('div'); modal.id = 'levelUpModal'; modal.innerHTML = `<div id="levelUpContent"><div id="levelUpHeader"><h2 id="levelUpTitle">LEVEL UP!</h2></div><div id="levelUpBadge"><span id="levelNumber"></span></div><div id="levelUpBody"><p id="levelUpMessage"></p><p id="levelUpXP"></p><button id="levelUpButton">Continue</button></div></div>`; document.body.appendChild(modal); const btn = document.getElementById('levelUpButton'); if (btn) btn.addEventListener('click', hideLevelUpModal); else console.error("Level up close btn not found."); }
   const lvlNumEl = document.getElementById('levelNumber'); if (lvlNumEl) lvlNumEl.textContent = newLevel;
   const xpEl = document.getElementById('levelUpXP'); if (xpEl) xpEl.textContent = `Total XP: ${totalXP}`;
   const msgEl = document.getElementById('levelUpMessage'); if(msgEl) { let msg = "Congrats! Keep it up!"; if (newLevel >= 10) msg = "Elite level achieved!"; else if (newLevel >= 5) msg = "Great job! Master in training!"; msgEl.textContent = msg; }
   modal.style.display = 'flex'; requestAnimationFrame(() => { requestAnimationFrame(() => { modal.style.opacity = '1'; }); });
   if (typeof createConfetti === 'function') createConfetti();
   if (window.Audio) { try { const s = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_c4b035d4a7.mp3?filename=level-up-arcade-6442.mp3'); s.volume = 0.4; s.play().catch(e=>console.warn("Audio play fail:", e)); } catch (e) { console.error("Audio init fail", e); }}
}
function hideLevelUpModal() { const m = document.getElementById('levelUpModal'); if (m) { m.style.opacity = '0'; setTimeout(() => { m.style.display = 'none'; }, 300); }}
function createConfetti() {
   const mc = document.getElementById('levelUpContent'); if (!mc) return;
   let cc = mc.querySelector('.confetti-container'); if (!cc) { cc = document.createElement('div'); cc.className = 'confetti-container'; Object.assign(cc.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none', zIndex: '5' }); mc.insertBefore(cc, mc.firstChild); } else { cc.innerHTML = ''; }
   const co = ['#FFC700', '#FF3D00', '#00C853', '#2979FF', '#AA00FF', '#D500F9']; const ct = 60;
   for (let i = 0; i < ct; i++) { const cf = document.createElement('div'); const sz = 6 + Math.random() * 6; Object.assign(cf.style, { position: 'absolute', width: `${sz}px`, height: `${sz}px`, backgroundColor: co[Math.floor(Math.random() * co.length)], borderRadius: `${Math.random() * 50}%`, left: `${Math.random() * 100}%`, top: `${-10 - Math.random() * 20}%`, opacity: '1', transform: `rotate(${Math.random() * 360}deg)`, animation: `confettiFall ${1.8 + Math.random() * 1.2}s ${Math.random() * 0.6}s linear forwards` }); cc.appendChild(cf); }
   setTimeout(() => { if (cc.parentNode) cc.remove(); }, 3000);
}

// Spaced Repetition Data Update
async function updateSpacedRepetitionData(questionId, isCorrect, difficulty, nextReviewInterval) {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.runTransaction) { console.error("System not ready for SR update."); return; }
  if (!questionId) { console.error("Invalid questionId for SR update."); return ; }
  const uid = window.auth.currentUser.uid; const ref = window.doc(window.db, 'users', uid);
  try {
    await window.runTransaction(window.db, async (t) => { const d = await t.get(ref); let data = d.exists() ? d.data() : {}; data.spacedRepetition = data.spacedRepetition || {}; const now = new Date(); const next = new Date(); const int = (typeof nextReviewInterval === 'number' && nextReviewInterval > 0) ? nextReviewInterval : 1; next.setDate(now.getDate() + int); const count = (data.spacedRepetition[questionId]?.reviewCount || 0) + 1; data.spacedRepetition[questionId] = { lastReviewedAt: now.toISOString(), nextReviewDate: next.toISOString(), reviewInterval: int, difficulty: difficulty, lastResult: isCorrect ? 'correct' : 'incorrect', reviewCount: count }; t.set(ref, data, { merge: true }); });
    console.log(`SR data updated for Q ${questionId}`); if(typeof updateReviewQueue === 'function') updateReviewQueue();
  } catch (e) { console.error("Error updating SR data:", e); }
}
window.updateSpacedRepetitionData = updateSpacedRepetitionData;

// Fetch Spaced Repetition Data
async function fetchSpacedRepetitionData() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) { console.warn("System not ready for fetchSRData."); return {}; }
  try { const uid = window.auth.currentUser.uid; const d = await window.getDoc(window.doc(window.db, 'users', uid)); return d.exists() ? (d.data().spacedRepetition || {}) : {}; } catch (e) { console.error("Error fetching SR data:", e); return {}; }
}
window.fetchSpacedRepetitionData = fetchSpacedRepetitionData;


// ==============================================================
// == DASHBOARD INITIALIZATION & EVENT SETUP (DEFINITIONS) ==
// ==============================================================

// Dashboard initialization
async function initializeDashboard() {
    const mainOptions = document.getElementById("mainOptions");
    if (!mainOptions || mainOptions.style.display === 'none') return;
    console.log("Initializing dashboard UI...");

    if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc || typeof calculateLevelProgress !== 'function' || typeof getLevelInfo !== 'function' || typeof fixStreakCalendar !== 'function' || typeof loadLeaderboardPreview !== 'function' || typeof updateReviewQueue !== 'function') {
        console.error("Dashboard initialization failed: Missing dependencies.");
        const dc = document.querySelector(".dashboard-container"); if(dc) dc.innerHTML = "<p style='color:red; text-align:center;'>Error loading dashboard data.</p>";
        return;
    }

    requestAnimationFrame(async () => { // Ensure DOM is ready
        try {
            const uid = window.auth.currentUser.uid;
            const userDocRef = window.doc(window.db, 'users', uid);
            const userDocSnap = await window.getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const data = userDocSnap.data(); const stats = data.stats || {}; const streaks = data.streaks || { currentStreak: 0 };
                const xp = stats.xp ?? 0; const level = stats.level ?? 1; const progress = calculateLevelProgress(xp); const levelInfo = getLevelInfo(level);
                let nextLevelText = (levelInfo.nextLevelXp !== null) ? `${levelInfo.nextLevelXp - xp} XP to Level ${level + 1}` : 'Max Level!';
                // *** FIX: Use let for nextLevelText ***
                if (levelInfo.nextLevelXp !== null && levelInfo.nextLevelXp - xp <= 0) {
                   nextLevelText = `Level ${level + 1} reached!`; // Reassign using let
                }

                document.getElementById("dashboardLevel")?.textContent = level;
                document.getElementById("dashboardXP")?.textContent = `${xp} XP`;
                document.getElementById("dashboardNextLevel")?.textContent = nextLevelText;
                document.getElementById("dashboardLevelProgress")?.style.setProperty('--progress', `${progress}%`);
                const totalAnswered = stats.totalAnswered || 0; const totalCorrect = stats.totalCorrect || 0; const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
                document.getElementById("dashboardAnswered")?.textContent = totalAnswered;
                document.getElementById("dashboardAccuracy")?.textContent = `${accuracy}%`;
                document.getElementById("currentStreak")?.textContent = streaks.currentStreak || 0;
                fixStreakCalendar(streaks);
                loadLeaderboardPreview(); updateReviewQueue();
                console.log("Dashboard UI updated successfully.");
            } else {
                 console.warn(`User doc (${uid}) missing during dashboard init.`);
                 document.getElementById("dashboardLevel")?.textContent = 1; document.getElementById("dashboardXP")?.textContent = `0 XP`; document.getElementById("dashboardNextLevel")?.textContent = `${getLevelInfo(1).nextLevelXp} XP to Level 2`; document.getElementById("dashboardLevelProgress")?.style.setProperty('--progress', `0%`); document.getElementById("dashboardAnswered")?.textContent = 0; document.getElementById("dashboardAccuracy")?.textContent = `0%`; document.getElementById("currentStreak")?.textContent = 0; fixStreakCalendar({}); loadLeaderboardPreview(); updateReviewQueue();
            }
        } catch (error) {
            console.error("Error during dashboard data fetch/update:", error);
            const dc = document.querySelector(".dashboard-container"); if(dc) dc.innerHTML = "<p style='color:red; text-align:center;'>Failed to load dashboard. Refresh?</p>";
        }
    });
}


// Set up event listeners for dashboard
function setupDashboardEvents() {
    requestAnimationFrame(() => { // Ensure elements are ready
        console.log("Setting up dashboard event listeners...");
        const addClickListenerOnce = (id, handler) => {
            const element = document.getElementById(id);
            if (element) { if (!element._dashboardListenerAttached) { element.addEventListener('click', handler); element._dashboardListenerAttached = true; } }
            else { console.warn(`Dashboard element #${id} not found for listener.`); }
        };
        addClickListenerOnce("startQuizBtn", () => { document.getElementById("quizSetupModal")?.style.display = "block"; });
        addClickListenerOnce("modalStartQuiz", () => { const c = document.getElementById("modalCategorySelect")?.value||""; const n=parseInt(document.getElementById("modalNumQuestions")?.value)||10; const iA=document.getElementById("modalIncludeAnswered")?.checked||!1; const uSR=document.getElementById("modalSpacedRepetition")?.checked||!1; document.getElementById("quizSetupModal")?.style.display="none"; if(typeof loadQuestions==='function')loadQuestions({type:c?'custom':'random',category:c,num:n,includeAnswered:iA,spacedRepetition:uSR}); else console.error("loadQuestions func missing!"); });
        addClickListenerOnce("modalCancelQuiz", () => { document.getElementById("quizSetupModal")?.style.display = "none"; });
        addClickListenerOnce("userProgressCard", () => { if (typeof displayPerformance === 'function') displayPerformance(); else console.error("displayPerformance missing!"); });
        addClickListenerOnce("quickStatsCard", () => { if (typeof displayPerformance === 'function') displayPerformance(); else console.error("displayPerformance missing!"); });
        addClickListenerOnce("leaderboardPreviewCard", () => { if (typeof showLeaderboard === 'function') showLeaderboard(); else console.error("showLeaderboard missing!"); });
        addClickListenerOnce("reviewQueueCard", async () => { if(typeof countDueReviews!=='function'||typeof getDueQuestionIds!=='function'||typeof loadSpecificQuestions!=='function') { console.error("Review funcs missing!"); return; } try { const { dueCount } = await countDueReviews(); if (dueCount === 0) { alert("No questions due for review!"); return; } const ids = await getDueQuestionIds(); if (ids.length === 0) { alert("Could not retrieve review questions."); return; } loadSpecificQuestions(ids); } catch (e) { console.error("Error starting review:", e); alert("Error starting review."); } });
        console.log("Dashboard listeners setup complete.");
    });
}


// Function to load leaderboard preview data
async function loadLeaderboardPreview() {
  const leaderboardPreview = document.getElementById("leaderboardPreview");
  if (!leaderboardPreview) return;
  if (!window.auth || !window.auth.currentUser || !window.db || !window.getDocs || !window.collection) { leaderboardPreview.innerHTML = '<div class="leaderboard-loading">Loading...</div>'; return; }
  leaderboardPreview.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
  try {
    const currentUid = window.auth.currentUser.uid; const qS = await window.getDocs(window.collection(window.db, 'users')); let entries = [];
    qS.forEach(dS => { const d = dS.data(); if (d && d.stats && typeof d.stats.xp === 'number') entries.push({ uid: dS.id, username: d.username || "Anonymous", xp: d.stats.xp }); });
    entries.sort((a, b) => b.xp - a.xp); let top3 = entries.slice(0, 3); let rank = -1, entry = null;
    for(let i=0; i < entries.length; i++) { if(entries[i].uid === currentUid) { rank = i + 1; entry = entries[i]; break; }} let showSep = rank > 3 && entry; let html = '';
    if (top3.length === 0) { html = '<div class="leaderboard-loading">Leaderboard empty!</div>'; }
    else { top3.forEach((e, i) => { const isCur = e.uid === currentUid; const r = i + 1; const uD = `${e.username}${isCur ? ' (You)' : ''}`; html += `<div class="leaderboard-preview-entry ${isCur?'current-user-entry':''}"><div class="leaderboard-rank leaderboard-rank-${r}">${r}</div><div class="leaderboard-user-info"><div class="leaderboard-username">${uD}</div><div class="leaderboard-user-xp">${e.xp} XP</div></div></div>`; }); if (showSep) html += `<div class="leaderboard-preview-entry current-user-entry"><div class="leaderboard-rank">${rank}</div><div class="leaderboard-user-info"><div class="leaderboard-username">${entry.username} (You)</div><div class="leaderboard-user-xp">${entry.xp} XP</div></div></div>`; }
    leaderboardPreview.innerHTML = html;
  } catch (e) { console.error("Error loading leaderboard preview:", e); leaderboardPreview.innerHTML = '<div class="leaderboard-loading" style="color: red;">Error loading</div>'; }
}

// Function to update the Review Queue card in the dashboard
async function updateReviewQueue() {
  const countEl = document.getElementById("reviewCount"); const contentEl = document.getElementById("reviewQueueContent"); const progressEl = document.getElementById("reviewProgressBar");
  if (!countEl || !contentEl || !progressEl) { console.warn("Review queue UI elements missing."); return; } if (typeof countDueReviews !== 'function') { console.error("countDueReviews func missing."); return; }
  try {
      const { dueCount, nextReviewDate } = await countDueReviews(); countEl.textContent = dueCount;
      const statsDiv = contentEl.querySelector(".review-stats"); const progCont = contentEl.querySelector(".review-progress-container"); let emptyDiv = contentEl.querySelector(".review-empty-state");
      if (dueCount > 0) { if (statsDiv) statsDiv.style.display = ''; if (progCont) progCont.style.display = ''; if (emptyDiv) emptyDiv.style.display = 'none'; const pct = Math.min(100, (dueCount / 20) * 100); progressEl.style.width = `${pct}%`; }
      else { if (statsDiv) statsDiv.style.display = 'none'; if (progCont) progCont.style.display = 'none'; let msg = "No reviews scheduled."; if (nextReviewDate) { const today = new Date(); today.setHours(0,0,0,0); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1); let fmtDate = (nextReviewDate.getTime() === tomorrow.getTime()) ? "Tomorrow" : nextReviewDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); msg = `Nothing due today!<br>Next: <span class="next-review-date">${fmtDate}</span>`; } if (!emptyDiv) { emptyDiv = document.createElement("div"); emptyDiv.className = "review-empty-state"; Object.assign(emptyDiv.style, { textAlign: 'center', color: '#666', fontSize: '0.9rem', padding: '10px 0', lineHeight: '1.4'}); contentEl.appendChild(emptyDiv); } emptyDiv.innerHTML = msg; emptyDiv.style.display = 'block'; }
  } catch (e) { console.error("Error updating review queue UI:", e); countEl.textContent = 'N/A'; }
}


// Function to fix streak calendar alignment
function fixStreakCalendar(streaksData) {
    const cal = document.getElementById("streakCalendar"); if (!cal) { console.warn("Streak calendar missing."); return; } cal.innerHTML = '';
    const today = new Date(); today.setHours(0, 0, 0, 0); let todayIdx = today.getDay() - 1; if (todayIdx < 0) todayIdx = 6;
    const streak = streaksData?.currentStreak || 0; let lastAnsDate = null;
    if (streaksData?.lastAnsweredDate) { try { const p = new Date(streaksData.lastAnsweredDate); if (!isNaN(p.getTime())) { lastAnsDate = new Date(p.getFullYear(), p.getMonth(), p.getDate()); }} catch(e) { console.error("Error parsing lastAnsDate:", e); }}
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - todayIdx);
    for (let i = 0; i < 7; i++) { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); const dc = document.createElement("div"); dc.className = "day-circle"; dc.textContent = d.getDate(); if (d.getTime() === today.getTime()) dc.classList.add("today"); if (streak > 0 && lastAnsDate) { const diff = Math.round((lastAnsDate - d) / 86400000); if (diff >= 0 && diff < streak && d <= today) dc.classList.add("active"); } cal.appendChild(dc); }
}


// Function to get IDs of questions due for review
async function getDueQuestionIds() {
  if (!window.auth || !window.auth.currentUser || !window.db || !window.doc || !window.getDoc) { console.warn("System not ready: getDueQuestionIds"); return []; }
  try { const uid = window.auth.currentUser.uid; const ref = window.doc(window.db, 'users', uid); const snap = await window.getDoc(ref); if (!snap.exists()) return []; const data = snap.data(); const srData = data.spacedRepetition || {}; const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); let dueIds = []; for (const qId in srData) { const rData = srData[qId]; if (!rData || !rData.nextReviewDate) continue; try { const rDate = new Date(rData.nextReviewDate); if (isNaN(rDate.getTime())) continue; const rDateOnly = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate()); if (rDateOnly <= today) dueIds.push(qId); } catch (e) { console.warn(`Date error Q ${qId}:`, e); }} return dueIds; } catch (e) { console.error("Error getDueQuestionIds:", e); return []; }
}

// Function to load only specific questions by ID for review session
async function loadSpecificQuestions(questionIds) {
  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) { alert("No questions for review."); return; } console.log(`Starting review: ${questionIds.length} questions.`);
  if (typeof Papa === 'undefined' || typeof csvUrl === 'undefined' || typeof shuffleArray !== 'function' || typeof initializeQuiz !== 'function') { console.error("Missing dependencies: loadSpecificQuestions."); alert("Error preparing review."); return; }
  try { Papa.parse(csvUrl, { download: true, header: true, skipEmptyLines: true, complete: function(res) { if (!res || !res.data || res.errors.length > 0) { console.error("CSV fail:", res?.errors); alert("Error loading questions."); return; } const allQ = res.data; const revQ = allQ.filter(q => q && q["Question"] && questionIds.includes(q["Question"].trim())); console.log(`Found ${revQ.length} matching questions.`); if (revQ.length === 0) { alert("Review questions not found in bank."); const mainOpts = document.getElementById("mainOptions"); if(mainOpts) mainOpts.style.display = 'flex'; return; } const shufQ = shuffleArray([...revQ]); initializeQuiz(shufQ); }, error: function(err) { console.error("CSV network/parse error:", err); alert("Error loading questions. Check connection."); } }); } catch (e) { console.error("Unexpected error loadSpecificQuestions:", e); alert("Error starting review."); }
}


// --- END OF FILE user.js ---
