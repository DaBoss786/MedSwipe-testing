// user-profile.js - Handle user profile UI elements
document.addEventListener('DOMContentLoaded', function() {
  // Create user profile container for toolbar
  function createUserProfileUI() {
    const toolbarRight = document.querySelector('.toolbar-right');
    
    if (!toolbarRight) return;
    
    // Check if element already exists
    let profileContainer = document.querySelector('.user-profile-container');
    
    if (!profileContainer) {
      // Create new container
      profileContainer = document.createElement('div');
      profileContainer.className = 'user-profile-container';
      profileContainer.style.display = 'none'; // Hidden initially
      
      profileContainer.innerHTML = `
        <div class="user-avatar"></div>
        <div class="user-name"></div>
      `;
      
      // Add to beginning of toolbar-right
      toolbarRight.insertBefore(profileContainer, toolbarRight.firstChild);
      
      // Add click handler for user menu
      profileContainer.addEventListener('click', function() {
        const userMenu = document.getElementById("userMenu");
        const menuOverlay = document.getElementById("menuOverlay");
        if (userMenu && menuOverlay) {
          userMenu.classList.add("open");
          menuOverlay.classList.add("show");
        }
      });
    }
    
    return profileContainer;
  }
  
  // Update user profile UI based on auth state
  function updateUserProfileUI(authState) {
    const profileContainer = createUserProfileUI();
    
    if (!profileContainer) return;
    
    if (authState.isRegistered && authState.user) {
      // User is registered - show profile
      const userAvatar = profileContainer.querySelector('.user-avatar');
      const userName = profileContainer.querySelector('.user-name');
      
      if (userAvatar && userName) {
        // Get first letter of username or email
        const displayName = authState.user.displayName || authState.user.email || 'User';
        const initial = displayName.charAt(0).toUpperCase();
        
        userAvatar.textContent = initial;
        userName.textContent = displayName;
      }
      
      profileContainer.style.display = 'flex';
    } else {
      // User is not registered or not logged in - hide profile
      profileContainer.style.display = 'none';
    }
  }
  
  // Update the user info section in the user menu
  function updateUserMenuInfo(authState) {
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    if (!usernameDisplay) return;
    
    // Update username display
    if (authState.isRegistered && authState.user) {
      const displayName = authState.user.displayName || authState.user.email || 'User';
      usernameDisplay.textContent = displayName;
      
      // Add logout button if it doesn't exist
      let logoutButton = document.getElementById('logoutButton');
      if (!logoutButton) {
        const userMenuList = document.getElementById('userMenuList');
        if (userMenuList) {
          const logoutItem = document.createElement('li');
          logoutButton = document.createElement('a');
          logoutButton.id = 'logoutButton';
          logoutButton.href = '#';
          logoutButton.textContent = 'Log Out';
          logoutItem.appendChild(logoutButton);
          userMenuList.appendChild(logoutItem);
          
          // Add logout functionality
          logoutButton.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
              await window.authFunctions.logoutUser();
              // Close the menu
              closeUserMenu();
            } catch (error) {
              console.error('Error logging out:', error);
            }
          });
        }
      }
    } else {
      // For anonymous users, show the existing username
      // Keep the existing username logic for anonymous users
    }
  }
  
  // Listen for auth state changes and update UI
  window.addEventListener('authStateChanged', function(event) {
    updateUserProfileUI(event.detail);
    updateUserMenuInfo(event.detail);
  });
  
  // Initialize UI based on current auth state (if available)
  if (window.authState) {
    updateUserProfileUI(window.authState);
    updateUserMenuInfo(window.authState);
  }
});
