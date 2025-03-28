// Define csvUrl globally so all functions can access it
window.csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ85bci-l8eImMlvV2Vw8LqnTpmSVoTqbZFscvQ5w6ptGZzb5q1DLyeFS7uIqoLtEw4lXLQohCfofXd/pub?output=csv";

// Global filter mode (used by quiz setup, maybe keep here or move if only used in one place)
window.filterMode = "all"; // OK to keep global for now

// Shuffle array (randomize item order)
function shuffleArray(array) {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  // Fisher-Yates (Knuth) Shuffle - more robust than sort
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
window.shuffleArray = shuffleArray; // Make globally available

// Get current question id from the active slide
function getCurrentQuestionId() {
  if (!window.mySwiper || !window.mySwiper.slides || window.mySwiper.slides.length === 0) return null; // Added safety checks
  let activeIndex = window.mySwiper.activeIndex;
  if (activeIndex < 0 || activeIndex >= window.mySwiper.slides.length) return null; // Boundary check

  let currentSlide = window.mySwiper.slides[activeIndex];
  // The logic assumes question slides are EVEN indices (0, 2, 4...)
  // If the active slide is an odd index (explanation slide), get the previous one
  if (activeIndex % 2 !== 0) {
      if (activeIndex > 0) {
          currentSlide = window.mySwiper.slides[activeIndex - 1];
      } else {
          return null; // Can't be on explanation slide 1 without question slide 0
      }
  }
  return currentSlide && currentSlide.dataset ? currentSlide.dataset.id : null;
}
window.getCurrentQuestionId = getCurrentQuestionId; // Make globally available

// Helper function to get the start of the week (for weekly leaderboards)
function getStartOfWeek() {
  let now = new Date();
  let day = now.getDay(); // 0=Sunday, 1=Monday, ... 6=Saturday
  let diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to make Monday the first day
  let weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0); // Set to midnight at the start of the day
  return weekStart.getTime(); // Return timestamp
}
window.getStartOfWeek = getStartOfWeek; // Make globally available (needed by stats.js)

// Generate HTML for leaderboard tabs (Used by stats.js)
function leaderboardTabsHTML(activeTab) {
  // This function is called within stats.js, doesn't strictly need to be global
  // but making it global doesn't hurt if it simplifies things.
  return `
    <div id="leaderboardTabs">
      <button class="leaderboard-tab ${activeTab === 'overall' ? 'active' : ''}" id="overallTab">XP Rankings</button>
      <button class="leaderboard-tab ${activeTab === 'streaks' ? 'active' : ''}" id="streaksTab">Streaks</button>
      <button class="leaderboard-tab ${activeTab === 'answered' ? 'active' : ''}" id="answeredTab">Total Answered</button>
    </div>
  `;
}
window.leaderboardTabsHTML = leaderboardTabsHTML; // Make globally available

// Close the side menu (left)
function closeSideMenu() {
  const sideMenu = document.getElementById("sideMenu");
  const menuOverlay = document.getElementById("menuOverlay");

  if (sideMenu) sideMenu.classList.remove("open");
  if (menuOverlay) menuOverlay.classList.remove("show");
}
window.closeSideMenu = closeSideMenu; // Make globally available (used by app.js)

// Close the user menu (right)
function closeUserMenu() {
  const userMenu = document.getElementById("userMenu");
  const menuOverlay = document.getElementById("menuOverlay");

  if (userMenu) userMenu.classList.remove("open");
  if (menuOverlay) menuOverlay.classList.remove("show");
}
window.closeUserMenu = closeUserMenu; // Make globally available (used by app.js)

// Reset favorite icon - Note: This might be better placed in quiz.js or ui.js
// as it directly manipulates a UI element related to the quiz. Let's keep it here for now.
async function updateFavoriteIcon() {
  let favoriteButton = document.getElementById("favoriteButton");
  if (favoriteButton) {
    const questionId = getCurrentQuestionId(); // Use the global function
    if (!questionId) {
        favoriteButton.innerText = "☆"; // Default empty star
        favoriteButton.style.color = "";
        return;
    }
    // Check bookmark status (requires getBookmarks from user.js)
    if (typeof getBookmarks === 'function') {
        const bookmarks = await getBookmarks();
        const isBookmarked = bookmarks.includes(questionId);
        favoriteButton.innerText = isBookmarked ? "★" : "☆";
        favoriteButton.style.color = isBookmarked ? "#007BFF" : "";
    } else {
         favoriteButton.innerText = "☆"; // Fallback if getBookmarks isn't ready
         favoriteButton.style.color = "";
    }
  }
}
window.updateFavoriteIcon = updateFavoriteIcon; // Make globally available
