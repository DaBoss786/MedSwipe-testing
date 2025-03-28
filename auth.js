// auth.js - Authentication functionality for MedSwipe
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Global reference to the auth state listener
let authStateListener = null;

// Auth state management - accessible throughout the app
window.authState = {
  user: null,
  isRegistered: false,
  isLoading: true
};

/**
 * Initialize authentication system and set up listeners
 * This should be called once when the app starts
 */
export function initAuth() {
  const auth = getAuth();
  const db = getFirestore();
  
  // Set up auth state listener
  authStateListener = onAuthStateChanged(auth, async (user) => {
    console.log("Auth state changed:", user ? user.uid : 'No user');
    window.authState.isLoading = true;
    
    if (user) {
      // User is signed in
      window.authState.user = user;
      
      // Check if this is a registered user or anonymous guest
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const isRegistered = userDoc.exists() && userDoc.data().isRegistered === true;
      window.authState.isRegistered = isRegistered;
      
      // Make sure the user document exists
      if (!userDoc.exists()) {
        // Create a new user document for this anonymous user
        await setDoc(doc(db, 'users', user.uid), {
          username: generateGuestUsername(),
          createdAt: serverTimestamp(),
          isRegistered: false,
          stats: {
            totalAnswered: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            categories: {},
            totalTimeSpent: 0,
            xp: 0,
            level: 1
          }
        });
      }
    } else {
      // No user is signed in, reset auth state
      window.authState.user = null;
      window.authState.isRegistered = false;
      
      // Automatically sign in anonymously
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Error signing in anonymously:", error);
      }
    }
    
    window.authState.isLoading = false;
    
    // Dispatch an event that components can listen for
    window.dispatchEvent(new CustomEvent('authStateChanged', { 
      detail: { ...window.authState }
    }));
  });
  
  // Return cleanup function
  return () => {
    if (authStateListener) {
      authStateListener();
      authStateListener = null;
    }
  };
}

/**
 * Check if the current user is registered (not anonymous)
 * @returns {boolean} True if user is registered, false if guest
 */
export function isUserRegistered() {
  return window.authState.isRegistered;
}

/**
 * Get the current user object
 * @returns {Object|null} The current user or null if not signed in
 */
export function getCurrentUser() {
  return window.authState.user;
}

/**
 * Register a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} username - User's display name
 * @returns {Promise<Object>} The newly created user
 */
export async function registerUser(email, password, username) {
  const auth = getAuth();
  const db = getFirestore();
  
  try {
    // Create the user with email/password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with username
    await updateProfile(user, { displayName: username });
    
    // Get any existing data for this user (if they were anonymous before)
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    const existingData = userDoc.exists() ? userDoc.data() : {};
    
    // Create or update the user document
    await setDoc(userDocRef, {
      ...existingData,
      username: username,
      email: email,
      isRegistered: true,
      updatedAt: serverTimestamp(),
      ...(userDoc.exists() ? {} : {
        createdAt: serverTimestamp(),
        stats: {
          totalAnswered: 0,
          totalCorrect: 0,
          totalIncorrect: 0,
          categories: {},
          totalTimeSpent: 0,
          xp: 0,
          level: 1
        }
      })
    }, { merge: true });
    
    return user;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
}

/**
 * Log in a user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} The logged in user
 */
export async function loginUser(email, password) {
  const auth = getAuth();
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}

/**
 * Log out the current user
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  const auth = getAuth();
  
  try {
    await signOut(auth);
    // Will automatically sign in anonymously due to our auth state listener
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

/**
 * Convert an anonymous account to a registered account
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} username - User's display name
 * @returns {Promise<Object>} The upgraded user
 */
export async function upgradeAnonymousUser(email, password, username) {
  // This is a simplified implementation
  // In a real app, you would use Firebase's linkWithCredential
  // For now, we'll just register a new user and copy their data
  
  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;
  
  if (!currentUser || !currentUser.isAnonymous) {
    throw new Error("No anonymous user to upgrade");
  }
  
  const anonymousUid = currentUser.uid;
  
  try {
    // Get existing user data
    const userDocRef = doc(db, 'users', anonymousUid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Sign out anonymous user
    await signOut(auth);
    
    // Create new registered user
    const newUser = await registerUser(email, password, username);
    
    // Copy data from anonymous user
    if (userDoc.exists()) {
      const newUserDocRef = doc(db, 'users', newUser.uid);
      await setDoc(newUserDocRef, {
        ...userData,
        username: username,
        email: email,
        isRegistered: true,
        previousAnonymousUid: anonymousUid,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    
    return newUser;
  } catch (error) {
    console.error("Error upgrading anonymous user:", error);
    // If something goes wrong, sign back in anonymously
    await signInAnonymously(auth);
    throw error;
  }
}

/**
 * Generate a random guest username
 * @returns {string} A guest username
 */
function generateGuestUsername() {
  const adjectives = ["Curious", "Medical", "Swift", "Learning", "Aspiring"];
  const nouns = ["Learner", "Student", "User", "Doctor", "Practitioner"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}${noun}${num}`;
}

// Make the auth functions available globally
window.authFunctions = {
  isUserRegistered,
  getCurrentUser,
  registerUser,
  loginUser,
  logoutUser,
  upgradeAnonymousUser
};

// Initialize authentication on script load
initAuth();
