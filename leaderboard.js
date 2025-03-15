// Leaderboard management functions

// Update the user's entry in the leaderboard collection
async function updateLeaderboardEntry() {
  if (!window.auth || !window.auth.currentUser) {
    console.log("User not authenticated for leaderboard update");
    return;
  }
  
  try {
    const uid = window.auth.currentUser.uid;
    const userDocRef = window.doc(window.db, 'users', uid);
    const userDocSnap = await window.getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      
      // Extract only the data needed for leaderboards
      const leaderboardData = {
        uid: uid,
        username: userData.username || "Anonymous",
        lastUpdated: window.serverTimestamp(),
        // XP ranking data
        xp: userData.stats?.xp || 0,
        level: userData.stats?.level || 1,
        // Streak data
        currentStreak: userData.streaks?.currentStreak || 0,
        longestStreak: userData.streaks?.longestStreak || 0,
        // Questions answered data
        totalAnswered: userData.stats?.totalAnswered || 0,
        totalCorrect: userData.stats?.totalCorrect || 0,
        weeklyAnswered: 0 // We'll calculate this next
      };
      
      // Calculate weekly answered count
      if (userData.answeredQuestions) {
        const weekStart = getStartOfWeek();
        let weeklyCount = 0;
        
        for (const key in userData.answeredQuestions) {
          const answer = userData.answeredQuestions[key];
          if (answer.timestamp && answer.timestamp >= weekStart) {
            weeklyCount++;
          }
        }
        
        leaderboardData.weeklyAnswered = weeklyCount;
      }
      
      // Update the leaderboard collection
      const leaderboardRef = window.doc(window.db, 'leaderboards', uid);
      await window.setDoc(leaderboardRef, leaderboardData);
      console.log("Leaderboard entry updated successfully");
    }
  } catch (error) {
    console.error("Error updating leaderboard entry:", error);
  }
}

// Load leaderboard preview for dashboard
async function loadLeaderboardPreview() {
  if (!window.auth || !window.auth.currentUser || !window.db) {
    console.log("Auth or DB not initialized for leaderboard preview");
    return;
  }
  
  const leaderboardPreview = document.getElementById("leaderboardPreview");
  if (!leaderboardPreview) return;
  
  try {
    const currentUid = window.auth.currentUser.uid;
    
    // Query the leaderboards collection instead of users
    const querySnapshot = await window.getDocs(
      window.query(
        window.collection(window.db, 'leaderboards'),
        window.orderBy('xp', 'desc'),
        window.limit(10)
      )
    );
    
    let leaderboardEntries = [];
    
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      leaderboardEntries.push({
        uid: docSnap.id,
        username: data.username || "Anonymous",
        xp: data.xp || 0
      });
    });
    
    // Get top 3
    let top3 = leaderboardEntries.slice(0, 3);
    
    // Find current user's position
    let currentUserRank = leaderboardEntries.findIndex(e => e.uid === currentUid) + 1;
    let currentUserEntry = leaderboardEntries.find(e => e.uid === currentUid);
    let showCurrentUser = currentUserRank > 3 && currentUserEntry;
    
    // Create HTML for the preview
    let html = '';
    
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
              <div class="leaderboard-username">${entry.username}${isCurrentUser ? ' (You)' : ''}</div>
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

// Make functions available globally
window.updateLeaderboardEntry = updateLeaderboardEntry;
window.loadLeaderboardPreview = loadLeaderboardPreview;
