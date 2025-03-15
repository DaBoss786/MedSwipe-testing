// One-time function to initialize leaderboard entries for all existing users
async function initializeLeaderboardEntries() {
  if (!window.auth || !window.auth.currentUser) {
    console.log("User not authenticated");
    return;
  }
  
  try {
    console.log("Starting leaderboard initialization...");
    
    // Get all existing users
    const querySnapshot = await window.getDocs(window.collection(window.db, 'users'));
    
    let count = 0;
    for (const docSnap of querySnapshot.docs) {
      const userData = docSnap.data();
      const uid = docSnap.id;
      
      // Extract leaderboard data
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
        weeklyAnswered: 0
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
      
      // Create the leaderboard entry
      const leaderboardRef = window.doc(window.db, 'leaderboards', uid);
      await window.setDoc(leaderboardRef, leaderboardData);
      
      count++;
    }
    
    console.log(`Leaderboard initialization complete: ${count} entries created`);
    alert(`Leaderboard initialization complete: ${count} entries created`);
  } catch (error) {
    console.error("Error initializing leaderboard entries:", error);
    alert("Error initializing leaderboard entries: " + error.message);
  }
}

// Add a button to run this function
const initButton = document.createElement('button');
initButton.textContent = 'Initialize Leaderboards';
initButton.style.position = 'fixed';
initButton.style.bottom = '10px';
initButton.style.right = '10px';
initButton.style.zIndex = '9999';
initButton.style.padding = '10px';
initButton.style.backgroundColor = '#0056b3';
initButton.style.color = 'white';
initButton.style.border = 'none';
initButton.style.borderRadius = '5px';
initButton.style.cursor = 'pointer';

initButton.addEventListener('click', async function() {
  initButton.disabled = true;
  initButton.textContent = 'Initializing...';
  await initializeLeaderboardEntries();
  initButton.remove();
});

document.body.appendChild(initButton);
