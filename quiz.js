// Quiz management variables
let allQuestions = []; // Holds all questions fetched from CSV
// Removed selectedCategory, answeredIds, currentQuestion, totalQuestions, score as global lets
// They should be managed within the scope of an active quiz instance if possible,
// or reset reliably by initializeQuiz. For now, keep them but be mindful.
let currentQuestionIndex = 0; // Use index instead of count for clarity
let currentQuizQuestions = []; // Holds questions for the *current* quiz instance
let currentQuizScore = 0;
let sessionStartXP = 0; // Track XP at the start of the quiz
let guestQuestionCounter = 0; // Counter for guest prompts

// Ensure questionStartTime is defined (used in addOptionListeners)
let questionStartTime = 0;

// Global references needed by other files (ensure defined in utils.js or here)
// const csvUrl = window.csvUrl; // Assumed global from utils.js
// window.shuffleArray = window.shuffleArray; // Assumed global from utils.js
// window.getCurrentQuestionId = window.getCurrentQuestionId; // Assumed global from utils.js

// Fetch questions from CSV (can be internal if only used by loadQuestions)
async function fetchQuestionBank() {
  return new Promise((resolve, reject) => {
    if (!window.csvUrl) { // Make sure csvUrl is defined
        reject("CSV URL is not defined.");
        return;
    }
    Papa.parse(window.csvUrl, {
      download: true,
      header: true,
      dynamicTyping: true, // Attempt to convert numbers/booleans
      skipEmptyLines: true, // Ignore empty rows
      complete: function(results) {
        if (results.data && results.data.length > 0) {
            // Basic validation: check for essential columns
            const requiredColumns = ["Question", "Correct Answer", "Explanation", "Category"];
            const headers = Object.keys(results.data[0]);
            const missingColumns = requiredColumns.filter(col => !headers.includes(col));
            if (missingColumns.length > 0) {
                 console.warn("CSV Warning: Missing required columns -", missingColumns.join(", "));
                 // Decide whether to reject or proceed with partial data
            }
             // Filter out any potentially invalid rows (e.g., where Question is missing)
             const validQuestions = results.data.filter(q => q["Question"] && String(q["Question"]).trim() !== "");
             console.log(`Fetched and validated ${validQuestions.length} questions.`);
             resolve(validQuestions);
        } else {
            console.error("CSV Parsing Error: No data found or invalid format.", results.errors);
            reject("No data found in CSV or format is invalid.");
        }
      },
      error: function(error) {
        console.error("Error fetching or parsing CSV:", error);
        reject(error);
      }
    });
  });
}
// fetchQuestionBank doesn't need to be global if only loadQuestions uses it.

// Load questions according to quiz options
async function loadQuestions(options = {}) {
  console.log("Loading questions with options:", options);

  // Show loading indicator? (Optional UI enhancement)
  // document.getElementById('loadingIndicator').style.display = 'block';

  try {
      // Fetch all questions only if not already fetched or if forced refresh
      if (allQuestions.length === 0) {
          allQuestions = await fetchQuestionBank();
      }

      let filteredQuestions = [...allQuestions]; // Start with a copy
      let persistentAnsweredIds = [];
      let spacedRepetitionData = {};
      let isGuest = true; // Assume guest initially

      // Check user status and fetch relevant data only if logged in
      if (window.auth && window.auth.currentUser) {
          isGuest = false;
          persistentAnsweredIds = await fetchPersistentAnsweredIds(); // Fetch saved progress
          if (options.spacedRepetition || options.type === 'review') { // Fetch SR data if needed
              spacedRepetitionData = await fetchSpacedRepetitionData();
          }
      } else {
          // Guest mode: Disable features requiring saved data
          if (options.bookmarksOnly) {
              alert("Please sign up to use bookmarks.");
              // document.getElementById('loadingIndicator').style.display = 'none';
              return; // Stop loading
          }
          if (options.spacedRepetition || options.type === 'review') {
              alert("Please sign up to use the Review Queue and Spaced Repetition.");
              // document.getElementById('loadingIndicator').style.display = 'none';
              return; // Stop loading
          }
          options.includeAnswered = false; // Guests always get unanswered relative to their *session* (handled later)
      }

      // --- Filtering Logic ---

      // 1. Bookmarks Filter (Registered Users Only)
      if (!isGuest && options.bookmarksOnly) {
          const bookmarks = await getBookmarks();
          if (bookmarks.length === 0) {
              alert("You haven't bookmarked any questions yet.");
              // document.getElementById('loadingIndicator').style.display = 'none';
              return;
          }
          filteredQuestions = filteredQuestions.filter(q => bookmarks.includes(q["Question"].trim()));
      }
      // 2. Spaced Repetition / Review Queue (Registered Users Only)
      else if (!isGuest && (options.spacedRepetition || options.type === 'review')) {
          const now = new Date();
          now.setHours(0,0,0,0); // Compare dates only

          // Find IDs due for review
          const dueQuestionIds = Object.keys(spacedRepetitionData).filter(qId => {
              const data = spacedRepetitionData[qId];
              if (!data || !data.nextReviewDate) return false;
              const nextReviewDate = new Date(data.nextReviewDate);
              nextReviewDate.setHours(0,0,0,0); // Compare dates only
              return nextReviewDate <= now;
          });

          console.log(`Found ${dueQuestionIds.length} questions due for review.`);

          if (dueQuestionIds.length === 0 && options.type === 'review') {
              alert("No questions currently due for review!");
               // document.getElementById('loadingIndicator').style.display = 'none';
              return;
          }

          // Get the actual question objects due for review
          const dueReviewQuestions = filteredQuestions.filter(q => dueQuestionIds.includes(q["Question"].trim()));

          if (options.type === 'review') {
               // If it's JUST a review session, only use due questions
               filteredQuestions = dueReviewQuestions;
               options.num = dueQuestionIds.length; // Review all due questions
          } else if (options.spacedRepetition) {
              // Mix due questions with new (unanswered) questions
              let unansweredQuestions = filteredQuestions.filter(q =>
                  !persistentAnsweredIds.includes(q["Question"].trim()) &&
                  !dueQuestionIds.includes(q["Question"].trim())
              );

              // Apply category filter if present
              if (options.category) {
                    dueReviewQuestions = dueReviewQuestions.filter(q => q["Category"] && q["Category"].trim() === options.category);
                    unansweredQuestions = unansweredQuestions.filter(q => q["Category"] && q["Category"].trim() === options.category);
              }

               // Decide mix ratio (e.g., prioritize reviews up to a limit)
              const totalNeeded = options.num || 10;
              const numReview = Math.min(dueReviewQuestions.length, Math.ceil(totalNeeded * 0.6)); // e.g., up to 60% review
              const numNew = Math.min(unansweredQuestions.length, totalNeeded - numReview);

               // Combine and shuffle
              filteredQuestions = shuffleArray([
                  ...shuffleArray(dueReviewQuestions).slice(0, numReview),
                  ...shuffleArray(unansweredQuestions).slice(0, numNew)
              ]);
          }
      }
      // 3. Standard Filters (Category, Include Answered)
      else {
           // Apply category filter
          if (options.category) {
              filteredQuestions = filteredQuestions.filter(q => q["Category"] && q["Category"].trim() === options.category);
          }
           // Apply 'includeAnswered' filter (only for registered users)
          if (!isGuest && !options.includeAnswered) {
              filteredQuestions = filteredQuestions.filter(q => !persistentAnsweredIds.includes(q["Question"].trim()));
          }
      }

      // --- Final Selection & Initialization ---

      if (filteredQuestions.length === 0) {
          alert("No questions match your criteria. Try changing the category or including answered questions.");
           // document.getElementById('loadingIndicator').style.display = 'none';
           // Show dashboard again if quiz couldn't start
           const mainOptions = document.getElementById("mainOptions");
           if (mainOptions) mainOptions.style.display = "flex";
          return;
      }

      // Shuffle and limit number
      let selectedQuestions = shuffleArray(filteredQuestions);
      if (options.num && options.num > 0 && options.num < selectedQuestions.length) {
          selectedQuestions = selectedQuestions.slice(0, options.num);
      }

      console.log(`Selected ${selectedQuestions.length} questions for the quiz.`);
      initializeQuiz(selectedQuestions); // Pass the final list to start the quiz

  } catch (error) {
      console.error("Error loading or preparing questions:", error);
      alert(`Failed to load questions: ${error.message || error}`);
      // Show dashboard again on error
       const mainOptions = document.getElementById("mainOptions");
       if (mainOptions) mainOptions.style.display = "flex";
  } finally {
      // Hide loading indicator
      // document.getElementById('loadingIndicator').style.display = 'none';
  }
}
window.loadQuestions = loadQuestions; // Make globally available

// Function to load only specific questions by ID (e.g., for Review Queue)
async function loadSpecificQuestions(questionIds) {
  if (!questionIds || questionIds.length === 0) {
    alert("No specific questions requested.");
    return;
  }
   // Add guest check
  if (!window.auth || !window.auth.currentUser) {
    alert("Please sign up to access review features.");
    return;
  }

  console.log(`Loading ${questionIds.length} specific review questions.`);

  try {
      // Ensure all questions are loaded
      if (allQuestions.length === 0) {
          allQuestions = await fetchQuestionBank();
      }

      // Filter the main bank for the requested IDs
      const reviewQuestions = allQuestions.filter(q =>
          questionIds.includes(q["Question"]?.trim()) // Add null check for Question property
      );

      console.log("Found matching review questions:", reviewQuestions.length);

      if (reviewQuestions.length === 0) {
          alert("Could not find the requested review questions. They might have been updated or removed.");
          // Show dashboard
           const mainOptions = document.getElementById("mainOptions");
           if (mainOptions) mainOptions.style.display = "flex";
          return;
      }

      // Shuffle the review questions and initialize
      initializeQuiz(shuffleArray([...reviewQuestions]), { type: 'review' }); // Pass type for context

  } catch (error) {
      console.error("Error loading specific questions:", error);
      alert("Error loading review questions. Please try again later.");
       // Show dashboard
       const mainOptions = document.getElementById("mainOptions");
       if (mainOptions) mainOptions.style.display = "flex";
  }
}
window.loadSpecificQuestions = loadSpecificQuestions; // Make globally available


// Initialize the quiz UI with selected questions
async function initializeQuiz(questions, quizOptions = {}) {
  console.log("Initializing quiz with", questions.length, "questions. Options:", quizOptions);
  let isGuest = !window.auth || !window.auth.currentUser;
  currentQuizQuestions = questions; // Store questions for this quiz instance
  currentQuestionIndex = 0;
  currentQuizScore = 0;
  guestQuestionCounter = 0; // Reset guest counter for new quiz
  sessionStartXP = 0; // Reset start XP

  // Get starting XP only if user is logged in
  if (!isGuest && window.db) { // Use the isGuest variable
  if (window.auth && window.auth.currentUser && window.db) {
      try {
          const uid = window.auth.currentUser.uid;
          const userDocRef = window.doc(window.db, 'users', uid);
          const userDocSnap = await window.getDoc(userDocRef);
          if (userDocSnap.exists()) {
              sessionStartXP = userDocSnap.data().stats?.xp || 0;
              console.log("Quiz starting XP:", sessionStartXP);
          }
      } catch (error) {
          console.error("Error getting starting XP:", error);
      }
  }

  updateProgress(); // Update progress bar/counter (0/total)

  let bookmarks = [];
    if (!isGuest) { // Use the isGuest variable
      bookmarks = await getBookmarks();
  }
  if (window.auth && window.auth.currentUser) {
      bookmarks = await getBookmarks(); // Fetch bookmarks for logged-in user
  }

  const quizSlides = document.getElementById("quizSlides");
  if (!quizSlides) {
      console.error("Quiz slides container not found!");
      return;
  }
  quizSlides.innerHTML = ""; // Clear previous slides

  // --- Create Swiper Slides ---
  questions.forEach(question => {
    if (!question || !question["Question"] || !question["Correct Answer"]) {
        console.warn("Skipping invalid question object:", question);
        return; // Skip incomplete question data
    }

    const questionSlide = document.createElement("div");
    questionSlide.className = "swiper-slide";
    const qId = String(question["Question"]).trim(); // Ensure ID is string
    questionSlide.dataset.id = qId;
    questionSlide.dataset.correct = String(question["Correct Answer"]).trim();
    questionSlide.dataset.explanation = question["Explanation"] || "No explanation provided.";
    questionSlide.dataset.category = question["Category"] || "Uncategorized";
    // Set initial bookmark state based on fetched bookmarks
    questionSlide.dataset.bookmarked = (!isGuest && bookmarks.includes(qId)) ? "true" : "false";

    // Build options HTML safely
    let optionsHTML = "";
    const optionKeys = ["Option A", "Option B", "Option C", "Option D", "Option E"];
    const optionLetters = ["A", "B", "C", "D", "E"];
    optionKeys.forEach((key, index) => {
        if (question[key] && String(question[key]).trim() !== "") {
            optionsHTML += `<button class="option-btn" data-option="${optionLetters[index]}">${optionLetters[index]}. ${String(question[key]).trim()}</button>`;
        }
    });

    // Build slide HTML
    questionSlide.innerHTML = `
      <div class="card">
        <div class="question">${qId}</div>
        ${question["Image URL"] && String(question["Image URL"]).trim() !== ""
          ? `<img src="${String(question["Image URL"]).trim()}" class="question-image" alt="Question Image">` // Added alt text
          : "" }
        <div class="options">
          ${optionsHTML}
        </div>
        <div class="swipe-hint" style="display:none;">Swipe up for explanation</div>
      </div>
    `;
    quizSlides.appendChild(questionSlide);

    // Create corresponding answer/explanation slide
    const answerSlide = document.createElement("div");
    answerSlide.className = "swiper-slide";
    answerSlide.innerHTML = `
      <div class="card">
        <div class="answer-content">
           <!-- Content added after answer -->
        </div>
         <div class="difficulty-buttons" style="display: none;"> <!-- Hide initially -->
             <p class="difficulty-prompt">How difficult was this question?</p>
             <div class="difficulty-btn-container">
                 <button class="difficulty-btn easy-btn" data-difficulty="easy">Easy</button>
                 <button class="difficulty-btn medium-btn" data-difficulty="medium">Medium</button>
                 <button class="difficulty-btn hard-btn" data-difficulty="hard">Hard</button>
             </div>
             <p class="review-scheduled" style="display: none;"></p> <!-- For feedback -->
         </div>
        <p class="swipe-next-hint" style="display: none;">Swipe up for next question</p>
        <button id="viewSummaryBtn_${qId.replace(/[^a-zA-Z0-9]/g, "")}" class="view-summary-btn" style="display:none;">View Summary</button> <!-- Unique ID -->
      </div>
    `;
    quizSlides.appendChild(answerSlide);
  }); // End questions.forEach

  // --- Initialize Swiper ---
  if (window.mySwiper) {
      window.mySwiper.destroy(true, true); // Destroy previous instance if exists
  }
  window.mySwiper = new Swiper('.swiper', {
    direction: 'vertical',
    loop: false, // Loop breaks the pairing of question/answer slides
    mousewheel: true,
    touchReleaseOnEdges: true, // Allow swipe out from first/last slide
    allowTouchMove: true, // Ensure touch works
    observer: true, // Detect changes to slides
    observeParents: true, // Detect changes to parent
    on: {
        // Event handlers like slideChangeTransitionEnd
        slideChangeTransitionEnd: function () {
            const activeIndex = this.activeIndex; // 'this' refers to swiper instance
            if (activeIndex % 2 === 0) { // Landed on a QUESTION slide
                questionStartTime = Date.now();
                console.log(`Question slide ${activeIndex / 2 + 1} active. Start time: ${questionStartTime}`);
                updateBookmarkIcon(); // Update bookmark icon for the new question
            } else { // Landed on an ANSWER slide
                console.log(`Answer slide for question ${Math.floor(activeIndex / 2) + 1} active.`);
                // Optionally hide hints on previous question slide if needed
            }
            // Prevent swiping past unanswered questions? - Maybe not needed with button clicks disabling swipe
        },
    }
  });

  addOptionListeners();
  if (typeof window.updateFavoriteIcon === 'function') window.updateFavoriteIcon(); // Use global function

  // --- Show Quiz UI ---
  const swiperElement = document.querySelector(".swiper");
  const bottomToolbar = document.getElementById("bottomToolbar");
  const iconBar = document.getElementById("iconBar");
  const mainOptions = document.getElementById("mainOptions");
  const otherViews = ["#performanceView", "#leaderboardView", "#aboutView", "#faqView"]; // Selectors for other views

  if (swiperElement) swiperElement.style.display = "block";
  if (bottomToolbar) bottomToolbar.style.display = "flex";
  if (iconBar) iconBar.style.display = "flex";
  if (mainOptions) mainOptions.style.display = "none";
  otherViews.forEach(sel => {
      const view = document.querySelector(sel);
      if (view) view.style.display = 'none';
  });

  console.log("Quiz UI initialized and displayed.");
}
// initializeQuiz doesn't necessarily need to be global, only called by loadQuestions/loadSpecificQuestions



// Update the bookmark icon based on the current question's bookmark status
function updateBookmarkIcon() { // This function is now in utils.js and global
    // Kept here temporarily for reference during refactor, should be removed
    // console.warn("Duplicate updateBookmarkIcon in quiz.js - should use global one from utils.js");
    if (typeof window.updateFavoriteIcon === 'function') {
        window.updateFavoriteIcon(); // Call the global version
    }
}

// Add click event listeners to quiz options
function addOptionListeners() {
  const optionButtons = document.querySelectorAll('.swiper-slide .option-btn');
  console.log(`Adding listeners to ${optionButtons.length} option buttons.`);

  optionButtons.forEach(btn => {
    // Ensure no duplicate listeners are added if this runs multiple times
    btn.replaceWith(btn.cloneNode(true)); // Clone to remove old listeners
  });

  // Re-select buttons after cloning
  document.querySelectorAll('.swiper-slide .option-btn').forEach(btn => {
      btn.addEventListener('click', handleAnswerSelection); // Use named handler
  });
}
// addOptionListeners internal to quiz.js

// Named handler for answer selection
async function handleAnswerSelection() {
    const card = this.closest('.card');
    if (!card || card.classList.contains('answered')) return; // Already answered

    card.classList.add('answered'); // Mark card as answered
    // Disable swiping while processing answer? mySwiper.allowTouchMove = false;

    const questionSlide = card.closest('.swiper-slide');
    const qId = questionSlide.dataset.id;
    const correct = questionSlide.dataset.correct;
    const explanation = questionSlide.dataset.explanation;
    const category = questionSlide.dataset.category;
    const selectedOption = this.getAttribute('data-option');
    const isCorrect = (selectedOption === correct);
    const timeSpent = Date.now() - questionStartTime;

    // --- Visual Feedback ---
    const options = card.querySelectorAll('.option-btn');
    options.forEach(option => {
        option.disabled = true; // Disable all options
        const optLetter = option.getAttribute('data-option');
        if (optLetter === correct) {
            option.classList.add('correct');
        } else if (optLetter === selectedOption) {
            option.classList.add('incorrect');
        }
    });

    const hint = card.querySelector('.swipe-hint');
    if (hint) hint.style.display = 'block'; // Show "swipe for explanation" hint

    // --- Populate Answer Slide ---
    const answerSlide = questionSlide.nextElementSibling;
    if (answerSlide) {
        const answerContentEl = answerSlide.querySelector('.answer-content');
        const difficultyButtonsEl = answerSlide.querySelector('.difficulty-buttons');
        const swipeNextHintEl = answerSlide.querySelector('.swipe-next-hint');
        const viewSummaryBtnEl = answerSlide.querySelector(`#viewSummaryBtn_${qId.replace(/[^a-zA-Z0-9]/g, "")}`); // Find unique button

        if (answerContentEl) {
             answerContentEl.innerHTML = `
                <div class="answer">
                  <strong>Result: ${isCorrect ? "Correct" : "Incorrect"}</strong><br>
                  Correct Answer: ${correct}<br>
                  <p style="margin-top: 10px;"><em>${explanation}</em></p>
                </div>
            `;
        }

        // Show difficulty buttons ONLY for logged-in users
        let isGuest = !window.auth || !window.auth.currentUser;
        if (!isGuest && difficultyButtonsEl) {
            difficultyButtonsEl.style.display = 'block';
            // Add listeners to difficulty buttons (ensure they are fresh)
            const difficultyBtns = difficultyButtonsEl.querySelectorAll('.difficulty-btn');
            difficultyBtns.forEach(diffBtn => {
                diffBtn.replaceWith(diffBtn.cloneNode(true)); // Clone to remove old listeners
            });
            difficultyButtonsEl.querySelectorAll('.difficulty-btn').forEach(diffBtn => {
                diffBtn.addEventListener('click', handleDifficultyRating); // Attach new listener
            });
        }

        // --- Handle Quiz Progression ---
        currentQuestionIndex++; // Increment index (0-based)
        if (isCorrect) {
            currentQuizScore++;
        }

        // Update progress bar/display
        updateProgress();

        // Increment guest counter and check for prompt
        if (isGuest) {
            guestQuestionCounter++;
            console.log(`Guest question count: ${guestQuestionCounter}`); // Debug log

            // Define prompt thresholds
            const firstPromptThreshold = 3;
            const subsequentPromptInterval = 10; // Show again every 10 questions after the first

            // Check if prompt should be shown
            if (guestQuestionCounter === firstPromptThreshold ||
               (guestQuestionCounter > firstPromptThreshold && (guestQuestionCounter - firstPromptThreshold) % subsequentPromptInterval === 0))
            {
                 console.log(`Threshold reached. Showing registration prompt.`);
                 // Call the function to show the prompt modal
                 if (typeof showRegistrationPrompt === 'function') {
                     showRegistrationPrompt('quiz_milestone'); // Pass context 'quiz_milestone'
                 } else {
                     console.warn("showRegistrationPrompt function not found!");
                 }
            }
        } else {
            // Logged-in user: Record answer and update stats
            await recordAnswer(qId, category, isCorrect, timeSpent);
            await updateQuestionStats(qId, isCorrect);
        }


        // Check if it's the last question
        if (currentQuestionIndex === currentQuizQuestions.length) {
            console.log("Last question answered.");
            if (swipeNextHintEl) swipeNextHintEl.style.display = 'none'; // Hide swipe hint
            // Prepare and show summary button
            if (viewSummaryBtnEl) {
                 viewSummaryBtnEl.style.display = 'block';
                 viewSummaryBtnEl.textContent = 'View Quiz Summary'; // Update text
                 // Add listener ONCE
                 viewSummaryBtnEl.replaceWith(viewSummaryBtnEl.cloneNode(true)); // Clone first
                 document.getElementById(viewSummaryBtnEl.id).addEventListener('click', showSummary); // Add listener to cloned button
                 console.log("Summary button added and listener attached.");
            }
            // prepareSummary(); // Data needed for summary is calculated directly in showSummary now
        } else {
             // Not the last question, show swipe hint
            if (swipeNextHintEl) swipeNextHintEl.style.display = 'block';
        }

    } else {
        console.error("Could not find answer slide for question:", qId);
    }

    // Re-enable swiping after processing
    // mySwiper.allowTouchMove = true;
}

// Named handler for difficulty rating
async function handleDifficultyRating() {
    const difficulty = this.getAttribute('data-difficulty');
    const answerSlide = this.closest('.swiper-slide');
    const questionSlide = answerSlide?.previousElementSibling; // Get corresponding question slide
    const qId = questionSlide?.dataset.id;
    const isCorrect = questionSlide?.querySelector('.option-btn.correct') !== null; // Check if a correct button exists

    if (!qId || !difficulty) return;

    // Disable all difficulty buttons after one is clicked
    const allDifficultyBtns = this.closest('.difficulty-buttons').querySelectorAll('.difficulty-btn');
    allDifficultyBtns.forEach(b => {
        b.disabled = true;
        b.classList.remove('selected'); // Clear previous selections if any
    });
    this.classList.add('selected'); // Highlight the clicked one

    // Determine review interval (simple logic for now)
    let nextReviewInterval = 1; // Default 1 day
    if (isCorrect) {
        if (difficulty === 'easy') nextReviewInterval = 7;
        else if (difficulty === 'medium') nextReviewInterval = 3;
        else if (difficulty === 'hard') nextReviewInterval = 1;
    } else {
        nextReviewInterval = 1; // Always review incorrect answers next day
    }

    // Update spaced repetition data in Firestore
    if (typeof updateSpacedRepetitionData === 'function') {
        await updateSpacedRepetitionData(qId, isCorrect, difficulty, nextReviewInterval);
    }

    // Show feedback to user
    const feedbackEl = this.closest('.difficulty-buttons').querySelector('.review-scheduled');
    if (feedbackEl) {
        feedbackEl.textContent = `Review scheduled in ${nextReviewInterval} day${nextReviewInterval > 1 ? 's' : ''}.`;
        feedbackEl.style.display = 'block';
    }
}

// Show summary slide (Replaces prepareSummary)
function showSummary() {
  console.log("Showing quiz summary...");

  // Calculate final stats directly
  const accuracy = currentQuizQuestions.length > 0 ? Math.round((currentQuizScore / currentQuizQuestions.length) * 100) : 0;
  let performanceMessage = "";
    if (accuracy >= 90) performanceMessage = "Excellent work!";
    else if (accuracy >= 70) performanceMessage = "Great job!";
    else if (accuracy >= 50) performanceMessage = "Good effort!";
    else performanceMessage = "Keep practicing!";

  // --- Get XP and Level Info (only for logged-in users) ---
  let sessionXP = 0;
  let currentLevel = 1;
  let currentXP = 0;
  let levelProgress = 0;

  if (window.auth && window.auth.currentUser) {
      // Fetch latest user data to show accurate final XP/Level
      // This is slightly inefficient but ensures accuracy if DB updates were slow
      // We could also use the values calculated during recordAnswer if confident
      const uid = window.auth.currentUser.uid;
      const userDocRef = window.doc(window.db, 'users', uid);
      // Consider using getDoc directly here, although less safe than transaction
      window.getDoc(userDocRef).then(userDocSnap => {
          if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              currentXP = data.stats?.xp || 0;
              currentLevel = data.stats?.level || 1;
              sessionXP = currentXP - sessionStartXP; // Calculate difference
              levelProgress = calculateLevelProgress(currentXP); // Recalculate progress
              console.log(`Summary XP Calc: Current ${currentXP}, Start ${sessionStartXP}, Session ${sessionXP}`);

               // Update the summary UI elements once data is fetched
                const sessionXPEl = document.getElementById('summarySessionXP');
                const totalXPEl = document.getElementById('summaryTotalXP');
                const progressBarEl = document.getElementById('summaryXPBar');
                if (sessionXPEl) sessionXPEl.textContent = `+${sessionXP} XP`;
                if (totalXPEl) totalXPEl.textContent = `Total: ${currentXP} XP (Level ${currentLevel})`;
                if (progressBarEl) progressBarEl.style.width = `${levelProgress}%`;

          }
      }).catch(error => console.error("Error fetching final user data for summary:", error));
  }

  // --- Create Summary Slide ---
  const summarySlide = document.createElement("div");
  summarySlide.className = "swiper-slide";
  summarySlide.innerHTML = `
    <div class="card quiz-summary-card">
      <div class="summary-header"><h2>Quiz Complete!</h2></div>
      <div class="summary-score">
        <div class="score-circle" style="background: conic-gradient(#28a745 ${accuracy}%, #f0f0f0 0);">
          <span>${accuracy}%</span>
        </div>
        <div class="score-text">
          <p><strong>${currentQuizScore} / ${currentQuizQuestions.length}</strong> correct</p>
          <p>${performanceMessage}</p>
        </div>
      </div>
      ${ // Conditionally show XP section only for logged-in users
          (!window.auth || !window.auth.currentUser) ? '' : `
          <div class="summary-xp">
              <div class="xp-header">XP Earned This Session</div>
              <div class="xp-value" id="summarySessionXP">+${sessionXP} XP</div> <!-- Initial value -->
              <div class="xp-bar-container">
                  <div class="xp-bar" id="summaryXPBar" style="width: ${levelProgress}%;"></div> <!-- Initial value -->
              </div>
              <div class="xp-total" id="summaryTotalXP">Total: ${currentXP} XP (Level ${currentLevel})</div> <!-- Initial value -->
          </div>
          `
      }
      <div class="summary-buttons">
        <button id="summaryStartNewQuizButton" class="start-quiz-btn">Start New Quiz</button>
        ${ // Conditionally show Leaderboard button only for logged-in users
             (!window.auth || !window.auth.currentUser) ? '' :
             '<button id="summaryLeaderboardButton" class="start-quiz-btn">View Leaderboard</button>'
        }
      </div>
       ${ // Add a prompt for guests to sign up
          (window.auth && window.auth.currentUser) ? '' :
          '<p class="guest-summary-prompt" style="margin-top: 15px; font-size: 0.9rem; color: #555;">Sign up to save your progress and compete on the leaderboards!</p>'
       }
    </div>
  `;

  // Add the slide to the DOM
  const quizSlides = document.getElementById("quizSlides");
   if (quizSlides) {
       quizSlides.appendChild(summarySlide);
  } else {
      console.error("Cannot append summary slide, container not found.");
      return;
  }

  // Update Swiper and navigate
  if (window.mySwiper) {
      window.mySwiper.update();
      window.mySwiper.slideTo(window.mySwiper.slides.length - 1); // Go to the new last slide
       // Disable further swiping on summary slide
       // window.mySwiper.allowTouchMove = false; // May prevent button clicks sometimes
  }

  // Add listeners for summary buttons
  const newQuizBtn = document.getElementById("summaryStartNewQuizButton");
  if (newQuizBtn) {
      newQuizBtn.addEventListener("click", function() {
          // Go back to dashboard
           const viewsToHide = [".swiper", "#bottomToolbar", "#iconBar", "#performanceView", "#leaderboardView", "#faqView", "#aboutView"];
           viewsToHide.forEach(selector => {
               const element = document.querySelector(selector);
               if (element) element.style.display = "none";
           });
           const mainOptions = document.getElementById("mainOptions");
           if (mainOptions) mainOptions.style.display = "flex";
      });
  }
  const leaderboardBtn = document.getElementById("summaryLeaderboardButton");
  if (leaderboardBtn) {
      leaderboardBtn.addEventListener("click", function() {
           // Hide quiz, show leaderboard
            const viewsToHide = [".swiper", "#bottomToolbar", "#iconBar", "#performanceView", "#faqView", "#aboutView", "#mainOptions"];
           viewsToHide.forEach(selector => {
               const element = document.querySelector(selector);
               if (element) element.style.display = "none";
           });
           if (typeof showLeaderboard === 'function') showLeaderboard();
      });
  }
}
// showSummary internal

// Update quiz progress UI elements
function updateProgress() {
  const totalInQuiz = currentQuizQuestions.length;
  const progressPercent = totalInQuiz > 0 ? (currentQuestionIndex / totalInQuiz) * 100 : 0;

  const progressBar = document.getElementById("progressBar");
  const questionProgressText = document.getElementById("questionProgress");
  const scoreDisplayText = document.getElementById("scoreDisplay");

  if (progressBar) progressBar.style.width = progressPercent + "%";
  if (questionProgressText) questionProgressText.textContent = `${currentQuestionIndex} / ${totalInQuiz}`;
  if (scoreDisplayText) scoreDisplayText.textContent = `Score: ${currentQuizScore}`;

  // No need to save to localStorage unless implementing session resume feature
  // localStorage.setItem("quizProgress", JSON.stringify({ ... });

  // Update user XP display in toolbar (only if logged in)
  if (window.auth && window.auth.currentUser && typeof updateUserXP === 'function') {
    updateUserXP();
  }
}
// updateProgress internal

// --- ADDITION: Function to show Registration Prompt Modal ---
// (This function will be called by handleAnswerSelection)
function showRegistrationPrompt(triggerContext = 'generic') {
    const modal = document.getElementById('registrationPromptModal');
    const messageEl = document.getElementById('promptMessage');

    if (!modal || !messageEl) {
        console.error("Registration prompt modal elements not found!");
        return;
    }

    // --- Customize Message Based on Context (Optional but Recommended) ---
    let message = "Sign up to save your progress and unlock all features!";
    if (triggerContext === 'quiz_milestone') {
        message = "You're doing great! Sign up to save your progress, track your stats, and compete on the leaderboards.";
    } else if (triggerContext === 'feature_gate') {
        message = "This feature requires an account. Sign up for free to unlock it!";
    } // Add more contexts later (e.g., 'quiz_complete', 'high_score')

    messageEl.textContent = message;

    // Show the modal
    modal.style.display = 'flex'; // Use flex for centering
    // Optionally add fade-in animation via CSS class
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
}
// Make it global so it can be called from other places later if needed
window.showRegistrationPrompt = showRegistrationPrompt;
