// Simple onboarding implementation for MedSwipe
document.addEventListener('DOMContentLoaded', function() {
  // Create welcome screen
  const welcomeScreen = document.createElement('div');
  welcomeScreen.id = 'welcomeScreen';
  welcomeScreen.className = 'welcome-screen';
  welcomeScreen.innerHTML = `
    <div class="welcome-content">
      <img src="MedSwipe Logo gradient.png" alt="MedSwipe Logo" class="welcome-logo">
      <h1>Welcome to MedSwipe</h1>
      <p>Learn medicine one swipe at a time</p>
      <div class="welcome-buttons">
        <button id="startLearningBtn" class="start-learning-btn">Start Learning</button>
        <button id="loginBtn" class="login-btn">I Already Have an Account</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(welcomeScreen);
  welcomeScreen.style.display = 'none';
  
  // Get splash screen element
  const splashScreen = document.getElementById('splashScreen');
  
  // Hide splash screen after 2 seconds and show welcome screen
  setTimeout(function() {
    if (splashScreen) {
      splashScreen.classList.add('fade-out');
      
      // Remove splash screen and show welcome screen
      setTimeout(function() {
        splashScreen.style.display = 'none';
        welcomeScreen.style.display = 'flex';
      }, 500);
    }
  }, 2000);
  
  // Start Learning button - go to main app as guest
  document.getElementById('startLearningBtn').addEventListener('click', function() {
    welcomeScreen.style.display = 'none';
    document.getElementById("mainOptions").style.display = "flex";
    
    // Store guest flag
    localStorage.setItem('isGuest', 'true');
  });
  
  // Login button - show login form
  document.getElementById('loginBtn').addEventListener('click', function() {
    // For now, just go to main app
    welcomeScreen.style.display = 'none';
    document.getElementById("mainOptions").style.display = "flex";
    
    // You can implement actual login later
    alert("Login functionality will be implemented in the next phase.");
  });
});
