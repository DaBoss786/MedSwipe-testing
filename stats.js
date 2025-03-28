
// Note: Assumes Chart.js is loaded via index.html
// Note: Assumes Firestore functions (getDocs, collection) and auth are available globally
// Note: Assumes helper functions (getOrGenerateUsername, getStartOfWeek, leaderboardTabsHTML) are available globally

// Display performance stats for logged-in users
async function displayPerformance() {
   // Add guest check
  if (!window.auth || !window.auth.currentUser) {
    alert("Please sign up or log in to view your performance statistics!");
    // Optionally show signup prompt
    // showRegistrationPrompt('performance_access');
    return;
  }
   if (!window.db) {
      alert("Database connection not available.");
      return;
  }

  console.log("Displaying Performance View for logged-in user.");
  // Hide other views
  document.querySelector(".swiper").style.display = "none";
  document.getElementById("bottomToolbar").style.display = "none";
  document.getElementById("iconBar").style.display = "none";
  document.getElementById("mainOptions").style.display = "none";
  document.getElementById("leaderboardView").style.display = "none";
  document.getElementById("aboutView").style.display = "none";
  document.getElementById("faqView").style.display = "none";

  const performanceView = document.getElementById("performanceView");
  if (!performanceView) {
      console.error("Performance view container not found.");
      return;
  }
  performanceView.style.display = "block";
  performanceView.innerHTML = `<p>Loading performance data...</p>`; // Loading state

  try {
      const uid = window.auth.currentUser.uid;
      const userDocRef = window.doc(window.db, 'users', uid);
      const userDocSnap = await window.getDoc(userDocRef);

      if (!userDocSnap.exists()) {
          performanceView.innerHTML = `
            <h2>Performance</h2>
            <p>No performance data available yet. Start answering questions!</p>
            <button id='backToMain' class="start-quiz-btn">Back to Dashboard</button>
          `;
          document.getElementById("backToMain").addEventListener("click", () => {
              performanceView.style.display = "none";
              document.getElementById("mainOptions").style.display = "flex";
          });
          return;
      }

      const data = userDocSnap.data();
      const stats = data.stats || {};
      const totalAnswered = stats.totalAnswered || 0;
      const totalCorrect = stats.totalCorrect || 0;
      const xp = stats.xp || 0;
      const level = stats.level || 1;
      const overallPercent = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

      // Fetch total questions in bank (consider caching this later)
      let totalInBank = 0;
      try {
          if (allQuestions && allQuestions.length > 0) { // Use cached if available
              totalInBank = allQuestions.length;
          } else {
               const bank = await fetchQuestionBank(); // Fetch if not cached
               totalInBank = bank.length;
               allQuestions = bank; // Cache it
          }
      } catch (fetchError) {
          console.error("Error fetching question bank for stats:", fetchError);
      }
      const remaining = Math.max(0, totalInBank - totalAnswered);

      // Get level progress info
      const levelInfo = getLevelInfo(level); // Use global function
      const levelProgress = calculateLevelProgress(xp); // Use global function
      const xpInCurrentLevel = xp - (levelInfo.currentLevelXp || 0);
      const xpRequiredForNextLevel = levelInfo.nextLevelXp ? levelInfo.nextLevelXp - (levelInfo.currentLevelXp || 0) : 0;

      // Build category breakdown HTML
      let categoryBreakdown = "<p>No category data available.</p>";
      if (stats.categories && Object.keys(stats.categories).length > 0) {
          categoryBreakdown = Object.keys(stats.categories).sort().map(cat => { // Sort categories alphabetically
              const c = stats.categories[cat];
              const answered = c.answered || 0;
              const correct = c.correct || 0;
              const percent = answered > 0 ? Math.round((correct / answered) * 100) : 0;
              return `
                <div class="category-item">
                  <strong>${cat}</strong>: ${correct}/${answered} (${percent}%)
                  <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percent}%"></div>
                  </div>
                </div>`;
          }).join("");
      }

      // --- Populate Performance View HTML ---
      performanceView.innerHTML = `
        <h2 style="text-align:center; color:#0056b3; margin-bottom: 25px;">Your Performance</h2>

        <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:20px; margin-bottom:25px;">
          <!-- Accuracy Doughnut Chart -->
          <div style="flex: 1; min-width: 200px; max-width: 250px; text-align: center;">
            <canvas id="overallScoreChart" width="180" height="180" style="margin: 0 auto;"></canvas>
            <p style="font-size:1.1rem; color:#333; margin-top:15px;">
              Overall Accuracy: <strong>${overallPercent}%</strong>
            </p>
          </div>

          <!-- XP Level Display -->
          <div style="flex: 1; min-width: 200px; max-width: 250px; text-align: center;">
            <div class="level-progress-circle" style="width:100px; height:100px; margin: 20px auto 10px;">
              <div class="level-circle-background"></div>
              <div class="level-circle-progress" id="performanceLevelProgress" style="--progress: ${levelProgress}%;"></div>
              <div class="level-number">${level}</div>
            </div>
            <p style="font-size:1.2rem; color:#0056b3; font-weight: 500; margin:5px 0;">
              ${xp} XP
            </p>
            <p style="font-size:0.85rem; color:#666; margin-top:0;">
              ${levelInfo.nextLevelXp ? `${xpRequiredForNextLevel - xpInCurrentLevel} XP to Level ${level + 1}` : 'Max Level Reached!'}
            </p>
          </div>
        </div>

        <div style="background:#f8f9fa; border-radius:8px; padding: 15px; margin:20px 0; border: 1px solid #eee;">
          <h3 style="margin-top:0; color:#333; text-align:center; font-size: 1.1rem;">Summary</h3>
          <p>Total Questions Answered: <strong>${totalAnswered}</strong></p>
          <p>Correct Answers: <strong>${totalCorrect}</strong></p>
          ${totalInBank > 0 ? `<p>Questions Remaining in Bank: <strong>${remaining}</strong></p>` : ''}
        </div>

        <hr style="margin: 25px 0;">
        <h3 style="text-align:center; color:#0056b3; margin-bottom: 15px;">Performance by Category</h3>
        <div class="category-breakdown-container">
           ${categoryBreakdown}
        </div>

        <button id="backToMain" class="start-quiz-btn" style="margin-top:25px;">Back to Dashboard</button>
      `;

      // --- Draw Chart ---
      const ctx = document.getElementById("overallScoreChart")?.getContext("2d");
      if (ctx) {
          new Chart(ctx, {
              type: "doughnut",
              data: {
                  labels: ["Correct", "Incorrect"],
                  datasets: [{
                      data: [totalCorrect, totalAnswered - totalCorrect],
                      backgroundColor: ["#28a745", "#dc3545"],
                      borderWidth: 2, // Add border for definition
                      borderColor: '#fff'
                  }]
              },
              options: {
                  responsive: true, // Make it responsive
                  maintainAspectRatio: false, // Allow custom sizing
                  cutout: "70%", // Adjust thickness
                  plugins: {
                      legend: { display: false }, // Hide default legend
                      tooltip: { enabled: true } // Keep tooltips
                  }
              }
          });
      } else {
          console.warn("Could not find canvas context for score chart.");
      }

      // Add listener for back button
      document.getElementById("backToMain").addEventListener("click", function() {
          performanceView.style.display = "none";
          document.getElementById("mainOptions").style.display = "flex";
      });

  } catch (error) {
      console.error("Error displaying performance:", error);
      performanceView.innerHTML = `<p>Error loading performance data.</p><button id='backToMain' class="start-quiz-btn">Back</button>`;
       document.getElementById("backToMain").addEventListener("click", () => {
          performanceView.style.display = "none";
          document.getElementById("mainOptions").style.display = "flex";
      });
  }
}
window.displayPerformance = displayPerformance; // Make globally available

// --- Leaderboard Functions ---

// Helper to render leaderboard list items
function renderLeaderboardEntries(entries, currentUid, valueKey, valueLabel) {
    let html = '<ul class="leaderboard-entry-list">';
    if (entries.length === 0) {
        html += `<div class="empty-state">No data available yet. Be the first!</div>`;
    } else {
        entries.forEach((entry, index) => {
            const isCurrentUser = entry.uid === currentUid;
            const rank = index + 1;
            html += `
              <li class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
                <div class="rank-container rank-${rank}">${rank}</div>
                <div class="user-info">
                  <p class="username">${entry.username || 'Anonymous'}</p>
                </div>
                <div class="user-stats">
                  <p class="stat-value">${entry[valueKey]}</p>
                  <p class="stat-label">${valueLabel}</p>
                </div>
              </li>`;
        });
    }
    html += '</ul>';
    return html;
}

// Helper to render current user's rank if not in top 10
function renderCurrentUserRank(currentUserEntry, currentUserRank, valueKey, valueLabel) {
    if (!currentUserEntry) return '';
    return `
      <div class="your-ranking">
        <h3>Your Ranking</h3>
        <div class="leaderboard-entry current-user">
          <div class="rank-container">${currentUserRank}</div>
          <div class="user-info">
            <p class="username">${currentUserEntry.username || 'Anonymous'}</p>
          </div>
          <div class="user-stats">
            <p class="stat-value">${currentUserEntry[valueKey]}</p>
            <p class="stat-label">${valueLabel}</p>
          </div>
        </div>
      </div>`;
}

// Load Overall XP Rankings Leaderboard
async function loadOverallData() {
   // Guest check performed by showLeaderboard which calls this
  console.log(`Loading XP rankings leaderboard`);
   const leaderboardView = document.getElementById("leaderboardView");
   leaderboardView.innerHTML = `<p>Loading XP Rankings...</p>`; // Loading state

  try {
      const currentUid = window.auth.currentUser.uid;
      const querySnapshot = await window.getDocs(window.collection(window.db, 'users'));
      let leaderboardEntries = [];

      querySnapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.stats) {
              leaderboardEntries.push({
                  uid: docSnap.id,
                  username: data.username || "Anonymous",
                  xp: data.stats.xp || 0
              });
          }
      });

      leaderboardEntries.sort((a, b) => b.xp - a.xp); // Sort descending XP

      const top10 = leaderboardEntries.slice(0, 10);
      const currentUserRank = leaderboardEntries.findIndex(e => e.uid === currentUid) + 1;
      const currentUserEntry = leaderboardEntries.find(e => e.uid === currentUid);

      let html = `<h2>Leaderboard</h2>${leaderboardTabsHTML("overall")}`; // Use global tab function
      html += renderLeaderboardEntries(top10, currentUid, 'xp', 'XP');
      if (currentUserRank > 10) {
           html += renderCurrentUserRank(currentUserEntry, currentUserRank, 'xp', 'XP');
      }
      html += `<button class="leaderboard-back-btn" id="leaderboardBack">Back to Dashboard</button>`;

      leaderboardView.innerHTML = html;
      addLeaderboardListeners(); // Add listeners for tabs/back button

  } catch (error) {
      console.error("Error loading overall leaderboard:", error);
      leaderboardView.innerHTML = `<p>Error loading leaderboard.</p><button id="leaderboardBack">Back</button>`;
      document.getElementById("leaderboardBack").addEventListener("click", () => { /* Go back */ });
  }
}
window.loadOverallData = loadOverallData; // Make globally available

// Load Streaks Leaderboard
async function loadStreaksData() {
    // Guest check performed by showLeaderboard which calls this
    console.log(`Loading Streaks leaderboard`);
    const leaderboardView = document.getElementById("leaderboardView");
    leaderboardView.innerHTML = `<p>Loading Streaks...</p>`;

    try {
        const currentUid = window.auth.currentUser.uid;
        const querySnapshot = await window.getDocs(window.collection(window.db, 'users'));
        let streakEntries = [];

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
             // Use current streak for ranking
            const streak = data.streaks?.currentStreak || 0;
            streakEntries.push({
                uid: docSnap.id,
                username: data.username || "Anonymous",
                streak: streak
            });
        });

        streakEntries.sort((a, b) => b.streak - a.streak); // Sort descending streak

        const top10 = streakEntries.slice(0, 10);
        const currentUserRank = streakEntries.findIndex(e => e.uid === currentUid) + 1;
        const currentUserEntry = streakEntries.find(e => e.uid === currentUid);

        let html = `<h2>Leaderboard</h2>${leaderboardTabsHTML("streaks")}`;
        html += renderLeaderboardEntries(top10, currentUid, 'streak', 'DAYS');
        if (currentUserRank > 10) {
           html += renderCurrentUserRank(currentUserEntry, currentUserRank, 'streak', 'DAYS');
        }
        html += `<button class="leaderboard-back-btn" id="leaderboardBack">Back to Dashboard</button>`;

        leaderboardView.innerHTML = html;
        addLeaderboardListeners();

    } catch (error) {
        console.error("Error loading streaks leaderboard:", error);
         leaderboardView.innerHTML = `<p>Error loading leaderboard.</p><button id="leaderboardBack">Back</button>`;
        document.getElementById("leaderboardBack").addEventListener("click", () => { /* Go back */ });
    }
}
window.loadStreaksData = loadStreaksData; // Make globally available

// Load Total Answered (Weekly) Leaderboard
async function loadTotalAnsweredData() {
     // Guest check performed by showLeaderboard which calls this
    console.log(`Loading Weekly Answered leaderboard`);
    const leaderboardView = document.getElementById("leaderboardView");
    leaderboardView.innerHTML = `<p>Loading Weekly Answered...</p>`;

    try {
        const currentUid = window.auth.currentUser.uid;
        const weekStartTimestamp = getStartOfWeek(); // Use global helper
        const querySnapshot = await window.getDocs(window.collection(window.db, 'users'));
        let answeredEntries = [];

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            let weeklyCount = 0;
            if (data.answeredQuestions) {
                // Count questions answered since the start of the week
                weeklyCount = Object.values(data.answeredQuestions)
                                   .filter(ans => ans.timestamp && ans.timestamp >= weekStartTimestamp)
                                   .length;
            }
             answeredEntries.push({
                uid: docSnap.id,
                username: data.username || "Anonymous",
                weeklyAnswered: weeklyCount
            });
        });

        answeredEntries.sort((a, b) => b.weeklyAnswered - a.weeklyAnswered); // Sort desc weekly count

        const top10 = answeredEntries.slice(0, 10);
        const currentUserRank = answeredEntries.findIndex(e => e.uid === currentUid) + 1;
        const currentUserEntry = answeredEntries.find(e => e.uid === currentUid);

        let html = `<h2>Leaderboard</h2>${leaderboardTabsHTML("answered")}`;
        html += renderLeaderboardEntries(top10, currentUid, 'weeklyAnswered', 'QUESTIONS');
         if (currentUserRank > 10) {
           html += renderCurrentUserRank(currentUserEntry, currentUserRank, 'weeklyAnswered', 'QUESTIONS');
        }
        html += `<button class="leaderboard-back-btn" id="leaderboardBack">Back to Dashboard</button>`;

        leaderboardView.innerHTML = html;
        addLeaderboardListeners();

    } catch (error) {
        console.error("Error loading total answered leaderboard:", error);
        leaderboardView.innerHTML = `<p>Error loading leaderboard.</p><button id="leaderboardBack">Back</button>`;
        document.getElementById("leaderboardBack").addEventListener("click", () => { /* Go back */ });
    }
}
window.loadTotalAnsweredData = loadTotalAnsweredData; // Make globally available

// Add event listeners for leaderboard tabs and back button
function addLeaderboardListeners() {
    const overallTab = document.getElementById("overallTab");
    const streaksTab = document.getElementById("streaksTab");
    const answeredTab = document.getElementById("answeredTab");
    const backBtn = document.getElementById("leaderboardBack");

    if (overallTab) overallTab.addEventListener("click", loadOverallData);
    if (streaksTab) streaksTab.addEventListener("click", loadStreaksData);
    if (answeredTab) answeredTab.addEventListener("click", loadTotalAnsweredData);

    if (backBtn) {
        backBtn.addEventListener("click", function() {
            const leaderboardView = document.getElementById("leaderboardView");
            const mainOptions = document.getElementById("mainOptions");
            if (leaderboardView) leaderboardView.style.display = "none";
            if (mainOptions) mainOptions.style.display = "flex"; // Return to dashboard
        });
    }
}
// addLeaderboardListeners is internal to stats.js
