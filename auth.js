// auth.js - Authentication functionality for MedSwipe

// Function to show welcome screen (called from app.js)
function setupWelcomeScreen() {
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
  
  // Event listeners for welcome screen buttons
  document.getElementById('startLearningBtn').addEventListener('click', function() {
    // Start as guest
    signInAsGuest();
    welcomeScreen.style.display = 'none';
    document.getElementById("mainOptions").style.display = "flex";
  });
  
  document.getElementById('loginBtn').addEventListener('click', function() {
    // Show login modal
    welcomeScreen.style.display = 'none';
    showLoginModal();
  });
  
  return welcomeScreen;
}

// Function to sign in anonymously
function signInAsGuest() {
  if (window.auth && window.signInAnonymously) {
    window.signInAnonymously(window.auth)
      .then(() => { 
        console.log("Signed in anonymously as guest:", window.auth.currentUser.uid); 
        
        // Store guest UID for potential future data transfer
        localStorage.setItem('guestUid', window.auth.currentUser.uid);
        
        // Mark user as guest in local storage
        localStorage.setItem('isGuest', 'true');
        
        // Initialize guest question counter
        localStorage.setItem('guestQuestionCount', '0');
      })
      .catch((error) => { 
        console.error("Anonymous sign-in error:", error); 
      });
  } else {
    console.error("Auth not initialized or signInAnonymously not available");
  }
}

// Function to check if user is a registered (non-anonymous) user
window.isUserRegistered = function() {
  return window.auth && 
         window.auth.currentUser && 
         !window.auth.currentUser.isAnonymous;
};

// Function to check if user is in guest mode
window.isGuestUser = function() {
  return window.auth && 
         window.auth.currentUser && 
         window.auth.currentUser.isAnonymous;
};

// Function to show login modal
function showLoginModal() {
  // Create login modal if it doesn't exist
  if (!document.getElementById('loginModal')) {
    const loginModal = document.createElement('div');
    loginModal.id = 'loginModal';
    loginModal.className = 'auth-modal';
    loginModal.innerHTML = `
      <div class="auth-modal-content">
        <h2>Log In</h2>
        <form id="loginForm">
          <div class="form-group">
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" required>
          </div>
          <div class="form-group">
            <label for="loginPassword">Password</label>
            <input type="password" id="loginPassword" required>
          </div>
          <div class="form-error" id="loginError"></div>
          <div class="auth-buttons">
            <button type="submit" class="auth-submit-btn">Log In</button>
            <button type="button" class="auth-cancel-btn" id="loginCancelBtn">Cancel</button>
          </div>
        </form>
        <div class="auth-footer">
          <p>Don't have an account? <a href="#" id="showSignupBtn">Sign Up</a></p>
        </div>
      </div>
    `;
    document.body.appendChild(loginModal);
    
    // Event listener for login form submission
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      // Try to sign in with email and password
      if (window.auth && window.signInWithEmailAndPassword) {
        window.signInWithEmailAndPassword(window.auth, email, password)
          .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log("User logged in:", user.uid);
            
            // Remove guest flag
            localStorage.removeItem('isGuest');
            localStorage.removeItem('guestQuestionCount');
            
            // Hide login modal and show main screen
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById("mainOptions").style.display = "flex";
            
            // Update UI with user info
            if (typeof updateUserMenu === 'function') {
              updateUserMenu();
            }
          })
          .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Login error:", errorCode, errorMessage);
            
            // Show error message
            const errorElement = document.getElementById('loginError');
            
            if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
              errorElement.textContent = 'Invalid email or password';
            } else {
              errorElement.textContent = errorMessage;
            }
          });
      }
    });
    
    // Event listeners for other buttons
    document.getElementById('loginCancelBtn').addEventListener('click', function() {
      document.getElementById('loginModal').style.display = 'none';
      document.getElementById('welcomeScreen').style.display = 'flex';
    });
    
    document.getElementById('showSignupBtn').addEventListener('click', function() {
      document.getElementById('loginModal').style.display = 'none';
      showSignupModal();
    });
  }
  
  // Show the login modal
  document.getElementById('loginModal').style.display = 'flex';
}

// Function to show signup modal
function showSignupModal() {
  // Create signup modal if it doesn't exist
  if (!document.getElementById('signupModal')) {
    const signupModal = document.createElement('div');
    signupModal.id = 'signupModal';
    signupModal.className = 'auth-modal';
    signupModal.innerHTML = `
      <div class="auth-modal-content">
        <h2>Sign Up</h2>
        <form id="signupForm">
          <div class="form-group">
            <label for="signupUsername">Username</label>
            <input type="text" id="signupUsername" required>
          </div>
          <div class="form-group">
            <label for="signupExperience">Experience Level</label>
            <select id="signupExperience" required>
              <option value="" disabled selected>Select your experience</option>
              <option value="Medical Student">Medical Student</option>
              <option value="PGY 1-2">PGY 1-2</option>
              <option value="PGY 3-4">PGY 3-4</option>
              <option value="PGY 5+">PGY 5+</option>
              <option value="Attending">Attending</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="signupEmail">Email</label>
            <input type="email" id="signupEmail" required>
          </div>
          <div class="form-group">
            <label for="signupPassword">Password</label>
            <input type="password" id="signupPassword" required>
          </div>
          <div class="form-group">
            <label for="signupConfirmPassword">Confirm Password</label>
            <input type="password" id="signupConfirmPassword" required>
          </div>
          <div class="form-error" id="signupError"></div>
          <div class="auth-buttons">
            <button type="submit" class="auth-submit-btn">Sign Up</button>
            <button type="button" class="auth-cancel-btn" id="signupCancelBtn">Cancel</button>
          </div>
        </form>
        <div class="auth-footer">
          <p>Already have an account? <a href="#" id="showLoginBtn">Log In</a></p>
        </div>
      </div>
    `;
    document.body.appendChild(signupModal);
    
    // Event listener for signup form submission
    document.getElementById('signupForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const confirmPassword = document.getElementById('signupConfirmPassword').value;
      const username = document.getElementById('signupUsername').value;
      const experience = document.getElementById('signupExperience').value;
      
      // Validate username
      if (!username) {
        document.getElementById('signupError').textContent = 'Username is required';
        return;
      }
      
      // Validate experience
      if (!experience) {
        document.getElementById('signupError').textContent = 'Please select your experience level';
        return;
      }
      
      // Validate password match
      if (password !== confirmPassword) {
        document.getElementById('signupError').textContent = 'Passwords do not match';
        return;
      }
      
      // Validate password strength
      if (password.length < 6) {
        document.getElementById('signupError').textContent = 'Password must be at least 6 characters';
        return;
      }
      
      // Try to create account with email and password
      if (window.auth && window.createUserWithEmailAndPassword) {
        window.createUserWithEmailAndPassword(window.auth, email, password)
          .then((userCredential) => {
            // Signed up
            const user = userCredential.user;
            console.log("User signed up:", user.uid);
            
            // Save user profile data
            saveUserProfile(user.uid, {
              username: username,
              experience: experience,
              email: email
            });
            
            // Check if user was previously in guest mode and transfer data
            transferGuestData(user.uid);
            
            // Remove guest flag
            localStorage.removeItem('isGuest');
            localStorage.removeItem('guestQuestionCount');
            
            // Hide signup modal and show main screen
            document.getElementById('signupModal').style.display = 'none';
            document.getElementById("mainOptions").style.display = "flex";
            
            // Show welcome message
            showWelcomeMessage();
            
            // Update UI with user info
            if (typeof updateUserMenu === 'function') {
              updateUserMenu();
            }
          })
          .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Signup error:", errorCode, errorMessage);
            
            // Show specific error message
            const errorElement = document.getElementById('signupError');
            
            if (errorCode === 'auth/email-already-in-use') {
              errorElement.textContent = 'Email is already in use';
            } else if (errorCode === 'auth/invalid-email') {
              errorElement.textContent = 'Invalid email format';
            } else {
              errorElement.textContent = errorMessage;
            }
          });
      }
    });
    
    // Event listeners for other buttons
    document.getElementById('signupCancelBtn').addEventListener('click', function() {
      document.getElementById('signupModal').style.display = 'none';
      document.getElementById('welcomeScreen').style.display = 'flex';
    });
    
    document.getElementById('showLoginBtn').addEventListener('click', function() {
      document.getElementById('signupModal').style.display = 'none';
      showLoginModal();
    });
  }
  
  // Show the signup modal
  document.getElementById('signupModal').style.display = 'flex';
}

// Function to save user profile to Firestore
function saveUserProfile(uid, profileData) {
  if (!window.db || !window.doc || !window.runTransaction) {
    console.error("Firestore functions not available");
    return;
  }
  
  const userDocRef = window.doc(window.db, 'users', uid);
  window.runTransaction(window.db, async (transaction) => {
    const docSnap = await transaction.get(userDocRef);
    let data = docSnap.exists() ? docSnap.data() : {};
    
    // Add profile data
    data.username = profileData.username;
    data.experience = profileData.experience;
    data.email = profileData.email;
    data.registrationDate = new Date().toISOString();
    
    transaction.set(userDocRef, data, { merge: true });
  }).catch(error => {
    console.error("Error saving user profile:", error);
  });
}

// Function to transfer guest data to registered account
function transferGuestData(newUid) {
  // Check for previously saved guest data
  const prevGuestUid = localStorage.getItem('guestUid');
  if (!prevGuestUid || !window.db || !window.doc || !window.getDoc || !window.runTransaction) {
    console.error("Guest UID not found or Firestore functions not available");
    return;
  }
  
  const guestDocRef = window.doc(window.db, 'users', prevGuestUid);
  const newUserDocRef = window.doc(window.db, 'users', newUid);
  
  window.getDoc(guestDocRef).then((docSnap) => {
    if (docSnap.exists()) {
      // Transfer data from guest account to new registered account
      const guestData = docSnap.data();
      
      window.runTransaction(window.db, async (transaction) => {
        const newUserDocSnap = await transaction.get(newUserDocRef);
        let newUserData = newUserDocSnap.exists() ? newUserDocSnap.data() : {};
        
        // Merge guest data with new user data
        if (guestData.answeredQuestions) {
          newUserData.answeredQuestions = {...(newUserData.answeredQuestions || {}), ...guestData.answeredQuestions};
        }
        
        if (guestData.bookmarks) {
          newUserData.bookmarks = [...new Set([...(newUserData.bookmarks || []), ...guestData.bookmarks])];
        }
        
        if (guestData.stats) {
          newUserData.stats = newUserData.stats || {};
          newUserData.stats.totalAnswered = (newUserData.stats.totalAnswered || 0) + (guestData.stats.totalAnswered || 0);
          newUserData.stats.totalCorrect = (newUserData.stats.totalCorrect || 0) + (guestData.stats.totalCorrect || 0);
          newUserData.stats.totalIncorrect = (newUserData.stats.totalIncorrect || 0) + (guestData.stats.totalIncorrect || 0);
          
          // Merge category stats
          newUserData.stats.categories = newUserData.stats.categories || {};
          if (guestData.stats.categories) {
            for (const category in guestData.stats.categories) {
              newUserData.stats.categories[category] = newUserData.stats.categories[category] || {
                answered: 0, correct: 0, incorrect: 0
              };
              
              newUserData.stats.categories[category].answered += guestData.stats.categories[category].answered || 0;
              newUserData.stats.categories[category].correct += guestData.stats.categories[category].correct || 0;
              newUserData.stats.categories[category].incorrect += guestData.stats.categories[category].incorrect || 0;
            }
          }
          
          // Transfer XP
          newUserData.stats.xp = (newUserData.stats.xp || 0) + (guestData.stats.xp || 0);
          
          // Recalculate level based on XP
          if (typeof calculateLevel === 'function') {
            newUserData.stats.level = calculateLevel(newUserData.stats.xp);
          }
        }
        
        // Transfer spacedRepetition data if it exists
        if (guestData.spacedRepetition) {
          newUserData.spacedRepetition = {...(newUserData.spacedRepetition || {}), ...guestData.spacedRepetition};
        }
        
        // Save merged data
        transaction.set(newUserDocRef, newUserData, { merge: true });
      }).catch(error => {
        console.error("Error transferring guest data:", error);
      });
    }
  }).catch(error => {
    console.error("Error getting guest data:", error);
  });
}

// Function to show welcome message after signup
function showWelcomeMessage() {
  const welcomeMsg = document.createElement('div');
  welcomeMsg.className = 'welcome-message';
  welcomeMsg.innerHTML = `
    <div class="welcome-message-content">
      <div class="welcome-icon">✓</div>
      <h3>Welcome to MedSwipe!</h3>
      <p>Your account has been created successfully. Your progress will now be saved automatically.</p>
      <button id="closeWelcomeMsg">Get Started</button>
    </div>
  `;
  document.body.appendChild(welcomeMsg);
  
  document.getElementById('closeWelcomeMsg').addEventListener('click', function() {
    welcomeMsg.style.opacity = '0';
    setTimeout(() => welcomeMsg.remove(), 300);
  });
  
  // Auto hide after 5 seconds
  setTimeout(() => {
    if (document.body.contains(welcomeMsg)) {
      welcomeMsg.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(welcomeMsg)) {
          welcomeMsg.remove();
        }
      }, 300);
    }
  }, 5000);
}

// Function to show signup prompt for guests
function showSignupPrompt(message) {
  // Don't show if already registered or if there's already a prompt showing
  if (window.isUserRegistered() || document.querySelector('.signup-prompt')) {
    return;
  }
  
  const promptMessage = message || "Create an account to save your progress and access all features!";
  
  const signupPrompt = document.createElement('div');
  signupPrompt.className = 'signup-prompt';
  signupPrompt.innerHTML = `
    <div class="signup-prompt-content">
      <p>${promptMessage}</p>
      <div class="signup-prompt-buttons">
        <button id="promptSignupBtn">Sign Up</button>
        <button id="promptGuestBtn">Continue as Guest</button>
      </div>
    </div>
  `;
  document.body.appendChild(signupPrompt);
  
  document.getElementById('promptSignupBtn').addEventListener('click', function() {
    signupPrompt.remove();
    showSignupModal();
  });
  
  document.getElementById('promptGuestBtn').addEventListener('click', function() {
    signupPrompt.style.opacity = '0';
    setTimeout(() => signupPrompt.remove(), 300);
  });
  
  // Auto hide after 10 seconds
  setTimeout(() => {
    if (document.body.contains(signupPrompt)) {
      signupPrompt.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(signupPrompt)) {
          signupPrompt.remove();
        }
      }, 300);
    }
  }, 10000);
}

// Function to check and track guest question count
function incrementGuestQuestionCount() {
  if (!window.isGuestUser()) return null;
  
  let count = parseInt(localStorage.getItem('guestQuestionCount') || '0');
  count++;
  localStorage.setItem('guestQuestionCount', count.toString());
  
  return count;
}

// Function to show feature gate prompt
function showFeatureGatePrompt(feature) {
  // Don't show if already registered or if there's already a prompt showing
  if (window.isUserRegistered() || document.querySelector('.feature-gate-prompt')) {
    return false;
  }
  
  const featureMessages = {
    leaderboard: "Create an account to see where you rank on the leaderboard!",
    bookmarks: "Create an account to bookmark questions for later review!",
    stats: "Create an account to track your performance stats!",
    spacedRepetition: "Create an account to use the spaced repetition learning system!"
  };
  
  const message = featureMessages[feature] || "Create an account to unlock all features!";
  
  const gatePrompt = document.createElement('div');
  gatePrompt.className = 'feature-gate-prompt';
  gatePrompt.innerHTML = `
    <div class="feature-gate-prompt-content">
      <p>${message}</p>
      <div class="feature-gate-prompt-buttons">
        <button id="gateSignupBtn">Sign Up</button>
        <button id="gateContinueBtn">Continue as Guest</button>
      </div>
    </div>
  `;
  document.body.appendChild(gatePrompt);
  
  document.getElementById('gateSignupBtn').addEventListener('click', function() {
    gatePrompt.remove();
    showSignupModal();
  });
  
  document.getElementById('gateContinueBtn').addEventListener('click', function() {
    gatePrompt.style.opacity = '0';
    setTimeout(() => gatePrompt.remove(), 300);
  });
  
  return true;
}

// Export functions
window.auth = {
  setupWelcomeScreen,
  showLoginModal,
  showSignupModal,
  showSignupPrompt,
  incrementGuestQuestionCount,
  showFeatureGatePrompt
};
