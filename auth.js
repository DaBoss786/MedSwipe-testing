// Login and Authentication Handling
import { getAuth, signInWithPopup, GoogleAuthProvider, 
         createUserWithEmailAndPassword, signInWithEmailAndPassword, 
         linkWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', function() {
  const auth = getAuth();
  const googleProvider = new GoogleAuthProvider();

  // DOM Elements
  const loginScreen = document.getElementById('loginScreen');
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  const emailSignInBtn = document.getElementById('emailSignInBtn');
  const guestContinueBtn = document.getElementById('guestContinueBtn');
  const guestWarningModal = document.getElementById('guestWarningModal');
  const emailSignInModal = document.getElementById('emailSignInModal');
  const emailRegisterModal = document.getElementById('emailRegisterModal');
  const emailSignInForm = document.getElementById('emailSignInForm');
  const emailRegisterForm = document.getElementById('emailRegisterForm');
  const continueAsGuestConfirmBtn = document.getElementById('continueAsGuestConfirmBtn');
  const registerInsteadBtn = document.getElementById('registerInsteadBtn');
  const switchToRegister = document.getElementById('switchToRegister');
  const switchToLogin = document.getElementById('switchToLogin');

  // Helper function to transfer anonymous user data
  async function transferAnonymousUserData(newUser) {
    try {
      const oldUid = auth.currentUser.uid;
      const newUid = newUser.uid;

      // Copy user document
      const oldUserDoc = await window.getDoc(window.doc(window.db, 'users', oldUid));
      if (oldUserDoc.exists()) {
        const userData = oldUserDoc.data();
        await window.doc(window.db, 'users', newUid).set(userData, { merge: true });
        
        // Optional: Delete old anonymous user document
        await window.deleteDoc(window.doc(window.db, 'users', oldUid));
      }
    } catch (error) {
      console.error("Error transferring user data:", error);
    }
  }

  // Google Sign-In
  googleSignInBtn.addEventListener('click', async () => {
  try {
    let result;
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      // Link anonymous account with Google
      result = await linkWithPopup(auth.currentUser, googleProvider);
      await transferAnonymousUserData(result.user);
    } else {
      // Regular Google Sign-In
      result = await signInWithPopup(auth, googleProvider);
    }
    
    // Redirect to dashboard
    loginScreen.style.display = 'none';
  } catch (error) {
    console.error("Google Sign-In error:", error);
    alert(`Sign-in failed: ${error.message}`);
  }
});

  // Email Sign-In
  emailSignInBtn.addEventListener('click', () => {
    emailSignInModal.style.display = 'flex';
  });

  emailSignInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginError = document.getElementById('loginError');

    try {
      let result;
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        // Link anonymous account with email
        const credential = EmailAuthProvider.credential(email, password);
        result = await linkWithCredential(auth.currentUser, credential);
        await transferAnonymousUserData(result.user);
      } else {
        // Regular email sign-in
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      
      loginScreen.style.display = 'none';
      emailSignInModal.style.display = 'none';
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  // Email Registration
  emailRegisterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const trainingLevel = document.getElementById('trainingLevel').value;
    const registerError = document.getElementById('registerError');

    try {
      let result;
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        // Link anonymous account with new email
        const credential = EmailAuthProvider.credential(email, password);
        result = await linkWithCredential(auth.currentUser, credential);
      } else {
        // Create new account
        result = await createUserWithEmailAndPassword(auth, email, password);
      }

      // Save additional user info
      const userDocRef = window.doc(window.db, 'users', result.user.uid);
      await window.setDoc(userDocRef, {
        username: username,
        trainingLevel: trainingLevel || null,
        email: email
      }, { merge: true });

      // Transfer data if linking anonymous account
      if (auth.currentUser.isAnonymous) {
        await transferAnonymousUserData(result.user);
      }

      loginScreen.style.display = 'none';
      emailRegisterModal.style.display = 'none';
    } catch (error) {
      registerError.textContent = error.message;
    }
  });

  // Guest Continue Handling
  guestContinueBtn.addEventListener('click', () => {
    guestWarningModal.style.display = 'flex';
  });

  continueAsGuestConfirmBtn.addEventListener('click', () => {
    guestWarningModal.style.display = 'none';
    loginScreen.style.display = 'none';
  });

  registerInsteadBtn.addEventListener('click', () => {
    guestWarningModal.style.display = 'none';
    emailRegisterModal.style.display = 'flex';
  });

  // Modal navigation
  switchToRegister.addEventListener('click', () => {
    emailSignInModal.style.display = 'none';
    emailRegisterModal.style.display = 'flex';
  });

  switchToLogin.addEventListener('click', () => {
    emailRegisterModal.style.display = 'none';
    emailSignInModal.style.display = 'flex';
  });

  auth.onAuthStateChanged((user) => {
  console.log("Auth State Changed:", user);
  
  if (!user) {
    console.log("No user - showing login screen");
    loginScreen.style.display = 'flex';
  } else if (user.isAnonymous) {
    console.log("Anonymous user - showing login screen");
    loginScreen.style.display = 'flex';
  } else {
    console.log("Authenticated user - hiding login screen");
    loginScreen.style.display = 'none';
  }
});
});
