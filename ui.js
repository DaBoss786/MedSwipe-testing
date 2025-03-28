// Show leaderboard view
function showLeaderboard() {
   // Add guest check
  if (!window.auth || !window.auth.currentUser) {
    alert("Please sign up or log in to view the leaderboards!");
    // Optionally show a specific signup prompt modal here
    // showRegistrationPrompt('leaderboard_access');
    return;
  }

  console.log("Showing Leaderboard View");
  // Hide other views
  document.querySelector(".swiper").style.display = "none";
  document.getElementById("bottomToolbar").style.display = "none";
  document.getElementById("iconBar").style.display = "none";
  document.getElementById("performanceView").style.display = "none";
  document.getElementById("mainOptions").style.display = "none";
  document.getElementById("aboutView").style.display = "none";
  document.getElementById("faqView").style.display = "none";

  // Show leaderboard container and load data
  const leaderboardView = document.getElementById("leaderboardView");
  if (leaderboardView) {
      leaderboardView.style.display = "block";
      // Load initial data (e.g., XP Rankings)
      if (typeof window.loadOverallData === 'function') {
          window.loadOverallData(); // Assumes loadOverallData handles its own loading state
      } else {
          leaderboardView.innerHTML = `<p>Error: Leaderboard data loading function not found.</p> <button id="leaderboardBack">Back</button>`;
           document.getElementById("leaderboardBack").addEventListener("click", function(){
               leaderboardView.style.display = "none";
               document.getElementById("mainOptions").style.display = "flex"; // Go back to dashboard
           });
          console.error("loadOverallData function not found");
      }
  } else {
      console.error("Leaderboard view container not found.");
  }
}
window.showLeaderboard = showLeaderboard; // Make globally available

// Show About us view
function showAbout() {
  console.log("Showing About View");
  // Hide other views
  document.querySelector(".swiper").style.display = "none";
  document.getElementById("bottomToolbar").style.display = "none";
  document.getElementById("iconBar").style.display = "none";
  document.getElementById("performanceView").style.display = "none";
  document.getElementById("leaderboardView").style.display = "none";
  document.getElementById("mainOptions").style.display = "none";
  document.getElementById("faqView").style.display = "none";

  // Populate and show About view
  const aboutView = document.getElementById("aboutView");
  if (aboutView) {
      aboutView.innerHTML = `
        <h2>About MedSwipe</h2>
        <p>MedSwipe is a dynamic, swipe-based quiz app designed specifically for medical professionals and learners. Our goal is to improve medical education by offering a casual, engaging alternative to the traditional, regimented board review resources and question banks.</p>
        <p>Created by a board-certified ENT, MedSwipe brings a fresh, interactive approach to studying medicine. Instead of slogging through lengthy textbooks and overly structured review materials, MedSwipe lets you learn on the go—one swipe at a time. The app is designed to keep you engaged with bite‑sized questions, real‑time performance tracking, and interactive leaderboards that make board review feel less like a chore and more like a game.</p>
        <p>Whether you're a seasoned practitioner or just starting out in medicine, MedSwipe is here to support your learning journey in a way that fits seamlessly into your busy lifestyle.</p>
        <button id="aboutBack" class="start-quiz-btn">Back to Dashboard</button>
      `;
      aboutView.style.display = "block";

      // Add listener for the back button
      const aboutBackBtn = document.getElementById("aboutBack");
      if (aboutBackBtn) {
          aboutBackBtn.addEventListener("click", function() {
              aboutView.style.display = "none";
              document.getElementById("mainOptions").style.display = "flex"; // Show dashboard
          });
      }
  } else {
       console.error("About view container not found.");
  }
}
window.showAbout = showAbout; // Make globally available

// Show FAQ view
function showFAQ() {
   console.log("Showing FAQ View");
  // Hide other views
  document.querySelector(".swiper").style.display = "none";
  document.getElementById("bottomToolbar").style.display = "none";
  document.getElementById("iconBar").style.display = "none";
  document.getElementById("performanceView").style.display = "none";
  document.getElementById("leaderboardView").style.display = "none";
  document.getElementById("aboutView").style.display = "none";
  document.getElementById("mainOptions").style.display = "none";

  // Populate and show FAQ view
  const faqView = document.getElementById("faqView");
  if (faqView) {
      // Using template literal for FAQ content
      faqView.innerHTML = `
        <h2>Frequently Asked Questions</h2>
        <ul>
          <li>
            <strong>What is MedSwipe?</strong><br>
            MedSwipe is a swipe-based medical quiz app for efficient and engaging learning, focusing initially on ENT.
          </li>
          <li>
            <strong>How does the XP and Level system work?</strong><br>
            Earn XP for answering questions (more for correct answers) and completing streaks or achievements. XP helps you level up. Higher levels require more XP.
          </li>
           <li>
            <strong>Can I use the app without an account?</strong><br>
            Yes! You can start learning immediately as a guest. However, signing up allows you to save progress, track stats, use bookmarks, access the Review Queue, and compete on leaderboards.
          </li>
          <li>
            <strong>What are Streaks?</strong><br>
            Streaks track consecutive days you use the app. Maintaining a streak earns bonus XP.
          </li>
          <li>
            <strong>What is the Review Queue?</strong><br>
            This feature uses spaced repetition. Based on how you answer and rate questions (Easy/Medium/Hard), it schedules questions for review at optimal times to improve retention. (Requires signup).
          </li>
           <li>
            <strong>How do Leaderboards work?</strong><br>
            Compete based on total XP, longest streak, or weekly questions answered. (Requires signup).
          </li>
          <li>
            <strong>Is MedSwipe free?</strong><br>
            Yes, MedSwipe is currently free to use.
          </li>
          <li>
            <strong>How do I report an error or give feedback?</strong><br>
            During a quiz, use the 'Feedback' button (💬 icon). For general feedback, use the 'Contact Us' option in the menu.
          </li>
        </ul>
        <button id="faqBack" class="start-quiz-btn">Back to Dashboard</button>
      `;
      faqView.style.display = "block";

      // Add listener for the back button
       const faqBackBtn = document.getElementById("faqBack");
       if (faqBackBtn) {
          faqBackBtn.addEventListener("click", function() {
              faqView.style.display = "none";
              document.getElementById("mainOptions").style.display = "flex"; // Show dashboard
          });
       }
  } else {
       console.error("FAQ view container not found.");
  }
}
window.showFAQ = showFAQ; // Make globally available

// Show Contact modal
function showContactModal() {
   console.log("Showing Contact Modal");
  const contactModal = document.getElementById("contactModal");
  if (contactModal) {
      // Reset form fields potentially
       const emailInput = document.getElementById('contactEmail');
       const messageInput = document.getElementById('contactMessage');
       // if (emailInput) emailInput.value = ''; // Optional: clear email
       if (messageInput) messageInput.value = ''; // Clear message

      contactModal.style.display = "flex"; // Use flex for centering
  } else {
       console.error("Contact modal container not found.");
  }
}
window.showContactModal = showContactModal; // Make globally available
