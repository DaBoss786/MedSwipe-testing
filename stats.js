// Make functions globally available
window.displayPerformance = displayPerformance;
window.loadOverallData = loadOverallData;
window.loadStreaksData = loadStreaksData;
window.loadTotalAnsweredData = loadTotalAnsweredData;

// Display performance stats with both accuracy chart and XP display
async function displayPerformance() {
  console.log("displayPerformance function called");
  document.querySelector(".swiper").style.display = "none";
  document.getElementById("bottomToolbar").style.display = "none";
  document.getElementById("iconBar").style.display = "none";
  document.getElementById("mainOptions").style.display = "none";
  document.getElementById("leaderboardView").style.display = "none";
  document.getElementById("aboutView").style.display = "none";
  document.getElementById("faqView").style.display = "none";
  document.getElementById("performanceView").style.display = "block";
  
  const uid = window.auth.currentUser.uid;
  const userDocRef = window.doc(window.db, 'users', uid);
  const userDocSnap = await window.getDoc(userDocRef);
  console.log("User document exists:", userDocSnap.exists());
  
  if (!userDocSnap.exists()) {
    document.getElementById("performanceView").innerHTML = `
      <h2>Performance</h2>
      <p>No performance data available yet.</p>
      <button id='backToMain'>Back</button>
    `;
    document.getElementById("backToMain").addEventListener("click", () => {
      document.getElementById("performanceView").style.display = "none";
      document.getElementById("mainOptions").style.display = "flex";
    });
    return;
  }
  
  // Rest of displayPerformance function...
  // Copy back your original implementation here
}

// Load XP Rankings leaderboard with weekly/all-time toggle
async function loadOverallData() {
  console.log(`Loading XP rankings leaderboard data`);
  const currentUid = window.auth.currentUser.uid;
  const currentUsername = await getOrGenerateUsername();
  const querySnapshot = await window.getDocs(window.collection(window.db, 'users'));
  let leaderboardEntries = [];
  
  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    // Only include EXPLICITLY registered users
    if (data.stats && data.isRegistered === true) {
      let xp = data.stats.xp || 0;
      const level = data.stats.level || 1;
      
      leaderboardEntries.push({
        uid: docSnap.id,
        username: data.username || "Anonymous",
        xp: xp,
        level: level
      });
    }
  });
  
  // Sort by XP (descending)
  leaderboardEntries.sort((a, b) => b.xp - a.xp);
  
  // Get top performers and assign ranks
  let top10 = leaderboardEntries.slice(0, 10);
  
  // Find current user's entry
  let currentUserEntry = leaderboardEntries.find(e => e.uid === currentUid);
  let currentUserRank = leaderboardEntries.findIndex(e => e.uid === currentUid) + 1;
  
  // Generate HTML without timeRange toggle buttons
  let html = `
    <h2>Leaderboard - XP Rankings</h2>
    
    <div id="leaderboardTabs">
      <button class="leaderboard-tab active" id="overallTab">XP Rankings</button>
      <button class="leaderboard-tab" id="streaksTab">Streaks</button>
      <button class="leaderboard-tab" id="answeredTab">Total Answered</button>
    </div>
    
    <ul class="leaderboard-entry-list">
  `;
  
  if (top10.length === 0) {
    html += `<div class="empty-state">No leaderboard data available yet. Start answering questions to be the first on the leaderboard!</div>`;
  } else {
    top10.forEach((entry, index) => {
      const isCurrentUser = entry.uid === currentUid;
      const rank = index + 1;
      
      html += `
        <li class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
          <div class="rank-container rank-${rank}">${rank}</div>
          <div class="user-info">
            <p class="username">${entry.username}</p>
          </div>
          <div class="user-stats">
            <p class="stat-value">${entry.xp}</p>
            <p class="stat-label">XP</p>
          </div>
        </li>
      `;
    });
  }
  
  html += `</ul>`;
  
  // Add current user's ranking if not in top 10
  if (currentUserEntry && !top10.some(e => e.uid === currentUid)) {
    html += `
      <div class="your-ranking">
        <h3>Your Ranking</h3>
        <div class="leaderboard-entry current-user">
          <div class="rank-container">${currentUserRank}</div>
          <div class="user-info">
            <p class="username">${currentUsername}</p>
          </div>
          <div class="user-stats">
            <p class="stat-value">${currentUserEntry.xp}</p>
            <p class="stat-label">XP</p>
          </div>
        </div>
      </div>
    `;
  }
  
  html += `<button class="leaderboard-back-btn" id="leaderboardBack">Back</button>`;
  
  document.getElementById("leaderboardView").innerHTML = html;
  
  // Add event listeners for tabs and back button
  document.getElementById("overallTab").addEventListener("click", function(){ 
    loadOverallData(); 
  });
  document.getElementById("streaksTab").addEventListener("click", function(){ 
    loadStreaksData(); 
  });
  document.getElementById("answeredTab").addEventListener("click", function(){ 
    loadTotalAnsweredData(); 
  });
  
  document.getElementById("leaderboardBack").addEventListener("click", function(){
    document.getElementById("leaderboardView").style.display = "none";
    document.getElementById("mainOptions").style.display = "flex";
    document.getElementById("aboutView").style.display = "none";
  });
}

// Load Streaks leaderboard (no time range tabs)
async function loadStreaksData() {
  const currentUid = window.auth.currentUser.uid;
  const currentUsername = await getOrGenerateUsername();
  const querySnapshot = await window.getDocs(window.collection(window.db, 'users'));
  let streakEntries = [];
  
  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    // Only include EXPLICITLY registered users
    if (data.isRegistered === true) {
      let streak = data.streaks ? (data.streaks.currentStreak || 0) : 0;
      streakEntries.push({
        uid: docSnap.id,
        username: data.username || "Anonymous",
        streak: streak
      });
    }
  });
  
  // Sort by streak length (descending)
  streakEntries.sort((a, b) => b.streak - a.streak);
  
  // Get top performers
  let top10 = streakEntries.slice(0, 10);
  
  // Find current user's entry
  let currentUserEntry = streakEntries.find(e => e.uid === currentUid);
  let currentUserRank = streakEntries.findIndex(e => e.uid === currentUid) + 1;
  
  // Generate HTML without time range tabs
  let html = `
    <h2>Leaderboard - Streaks</h2>
    
    <div id="leaderboardTabs">
      <button class="leaderboard-tab" id="overallTab">XP Rankings</button>
      <button class="leaderboard-tab active" id="streaksTab">Streaks</button>
      <button class="leaderboard-tab" id="answeredTab">Total Answered</button>
    </div>
    
    <ul class="leaderboard-entry-list">
  `;
  
  if (top10.length === 0) {
    html += `<div class="empty-state">No streak data available yet. Use the app daily to build your streak!</div>`;
  } else {
    top10.forEach((entry, index) => {
      const isCurrentUser = entry.uid === currentUid;
      const rank = index + 1;
      
      html += `
        <li class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
          <div class="rank-container rank-${rank}">${rank}</div>
          <div class="user-info">
            <p class="username">${entry.username}</p>
          </div>
          <div class="user-stats">
            <p class="stat-value">${entry.streak}</p>
            <p class="stat-label">DAYS</p>
          </div>
        </li>
      `;
    });
  }
  
  html += `</ul>`;
  
  // Add current user's ranking if not in top 10
  if (currentUserEntry && !top10.some(e => e.uid === currentUid)) {
    html += `
      <div class="your-ranking">
        <h3>Your Ranking</h3>
        <div class="leaderboard-entry current-user">
          <div class="rank-container">${currentUserRank}</div>
          <div class="user-info">
            <p class="username">${currentUsername}</p>
          </div>
          <div class="user-stats">
            <p class="stat-value">${currentUserEntry.streak}</p>
            <p class="stat-label">DAYS</p>
          </div>
        </div>
      </div>
    `;
  }
  
  html += `<button class="leaderboard-back-btn" id="leaderboardBack">Back</button>`;
  
  document.getElementById("leaderboardView").innerHTML = html;
  
  // Add event listeners for tabs and back button
  document.getElementById("overallTab").addEventListener("click", function(){ loadOverallData(); });
  document.getElementById("streaksTab").addEventListener("click", function(){ loadStreaksData(); });
  document.getElementById("answeredTab").addEventListener("click", function(){ loadTotalAnsweredData(); });
  
  document.getElementById("leaderboardBack").addEventListener("click", function(){
    document.getElementById("leaderboardView").style.display = "none";
    document.getElementById("mainOptions").style.display = "flex";
    document.getElementById("aboutView").style.display = "none";
  });
}

// Load Total Answered leaderboard (no time range tabs)
async function loadTotalAnsweredData() {
  const currentUid = window.auth.currentUser.uid;
  const currentUsername = await getOrGenerateUsername();
  const weekStart = getStartOfWeek();
  const querySnapshot = await window.getDocs(window.collection(window.db, 'users'));
  let answeredEntries = [];
  
  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    // Only include EXPLICITLY registered users
    if (data.isRegistered === true) {
      let weeklyCount = 0;
      if (data.answeredQuestions) {
        for (const key in data.answeredQuestions) {
          const answer = data.answeredQuestions[key];
          if (answer.timestamp && answer.timestamp >= weekStart) {
            weeklyCount++;
          }
        }
      }
      
      answeredEntries.push({
        uid: docSnap.id,
        username: data.username || "Anonymous",
        weeklyCount: weeklyCount
      });
    }
  });
  
  // Sort by weekly count (descending)
  answeredEntries.sort((a, b) => b.weeklyCount - a.weeklyCount);
  
  // Get top performers
  let top10 = answeredEntries.slice(0, 10);
  
  // Find current user's entry
  let currentUserEntry = answeredEntries.find(e => e.uid === currentUid);
  let currentUserRank = answeredEntries.findIndex(e => e.uid === currentUid) + 1;
  
  // Generate HTML without time range tabs
  let html = `
    <h2>Leaderboard - Total Answered Questions This Week</h2>
    
    <div id="leaderboardTabs">
      <button class="leaderboard-tab" id="overallTab">XP Rankings</button>
      <button class="leaderboard-tab" id="streaksTab">Streaks</button>
      <button class="leaderboard-tab active" id="answeredTab">Total Answered</button>
    </div>
    
    <ul class="leaderboard-entry-list">
  `;
  
  if (top10.length === 0) {
    html += `<div class="empty-state">No questions answered this week yet. Start answering questions to appear on the leaderboard!</div>`;
  } else {
    top10.forEach((entry, index) => {
      const isCurrentUser = entry.uid === currentUid;
      const rank = index + 1;
      
      html += `
        <li class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
          <div class="rank-container rank-${rank}">${rank}</div>
          <div class="user-info">
            <p class="username">${entry.username}</p>
          </div>
          <div class="user-stats">
            <p class="stat-value">${entry.weeklyCount}</p>
            <p class="stat-label">QUESTIONS</p>
          </div>
        </li>
      `;
    });
  }
  
  html += `</ul>`;
  
  // Add current user's ranking if not in top 10
  if (currentUserEntry && !top10.some(e => e.uid === currentUid)) {
    html += `
      <div class="your-ranking">
        <h3>Your Ranking</h3>
        <div class="leaderboard-entry current-user">
          <div class="rank-container">${currentUserRank}</div>
          <div class="user-info">
            <p class="username">${currentUsername}</p>
          </div>
          <div class="user-stats">
            <p class="stat-value">${currentUserEntry.weeklyCount}</p>
            <p class="stat-label">QUESTIONS</p>
          </div>
        </div>
      </div>
    `;
  }
  
  html += `<button class="leaderboard-back-btn" id="leaderboardBack">Back</button>`;
  
  document.getElementById("leaderboardView").innerHTML = html;
  
  // Add event listeners for tabs and back button
  document.getElementById("overallTab").addEventListener("click", function(){ loadOverallData(); });
  document.getElementById("streaksTab").addEventListener("click", function(){ loadStreaksData(); });
  document.getElementById("answeredTab").addEventListener("click", function(){ loadTotalAnsweredData(); });
  
  document.getElementById("leaderboardBack").addEventListener("click", function(){
    document.getElementById("leaderboardView").style.display = "none";
    document.getElementById("mainOptions").style.display = "flex";
    document.getElementById("aboutView").style.display = "none";
  });
}

// Default function to show leaderboard
function showLeaderboard() {
  // Check if user is registered
  if (window.auth && window.auth.currentUser && window.auth.currentUser.isAnonymous) {
    // Show registration benefits modal instead for guest users
    if (typeof window.showRegistrationBenefitsModal === 'function') {
      window.showRegistrationBenefitsModal();
    } else {
      alert("Leaderboards are only available for registered users. Please create a free account to access this feature.");
    }
    return;
  }
  
  // Continue with showing leaderboard for registered users
  document.querySelector(".swiper").style.display = "none";
  document.getElementById("bottomToolbar").style.display = "none";
  document.getElementById("iconBar").style.display = "none";
  document.getElementById("performanceView").style.display = "none";
  document.getElementById("mainOptions").style.display = "none";
  document.getElementById("aboutView").style.display = "none";
  document.getElementById("faqView").style.display = "none";
  document.getElementById("leaderboardView").style.display = "block";
  
  // Use the loadOverallData function from window object
  if (typeof window.loadOverallData === 'function') {
    window.loadOverallData();
  } else {
    // Fallback message if function is not available
    document.getElementById("leaderboardView").innerHTML = `
      <h2>Leaderboard</h2>
      <p>Leaderboards are loading... Please try again in a moment.</p>
      <button class="leaderboard-back-btn" id="leaderboardBack">Back</button>
    `;
    document.getElementById("leaderboardBack").addEventListener("click", function(){
      document.getElementById("leaderboardView").style.display = "none";
      document.getElementById("mainOptions").style.display = "flex";
    });
    
    console.log("loadOverallData function not found");
  }
}
