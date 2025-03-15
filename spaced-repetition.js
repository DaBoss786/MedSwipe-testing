// Spaced Repetition Logic

// Calculate next review based on performance
function calculateNextReview(lastReview, difficulty) {
  // Interval progression based on difficulty
  const intervalMultipliers = {
    "hard": 1.2,   // Shorter intervals for challenging questions
    "medium": 2,   // Standard progression
    "easy": 3      // Longer intervals for well-understood questions
  };
  
  // Base intervals
  const baseIntervals = [1, 3, 7, 16, 30, 60];
  
  // Determine next interval
  const currentRepetition = Math.min(
    lastReview.repetitions, 
    baseIntervals.length - 1
  );
  
  // Calculate new interval with difficulty adjustment
  const multiplier = intervalMultipliers[difficulty];
  const baseInterval = baseIntervals[currentRepetition];
  const newInterval = Math.round(baseInterval * multiplier);
  
  return {
    interval: newInterval,
    repetitions: lastReview.repetitions + 1
  };
}

// Review a question
async function reviewQuestion(questionId, isCorrect, difficulty) {
  const userId = window.auth.currentUser.uid;
  const reviewRef = window.doc(window.db, 'userReviews', `${userId}_${questionId}`);
  
  try {
    await window.runTransaction(window.db, async (transaction) => {
      const reviewDoc = await transaction.get(reviewRef);
      const reviewData = reviewDoc.exists() ? reviewDoc.data() : {
        questionId,
        userId,
        reviewHistory: [],
        nextReviewDate: null,
        masteryScore: 0,
        totalAttempts: 0,
        correctAttempts: 0
      };
      
      // Update attempts tracking
      reviewData.totalAttempts++;
      if (isCorrect) {
        reviewData.correctAttempts++;
      }
      
      // Calculate mastery score
      reviewData.masteryScore = Math.round(
        (reviewData.correctAttempts / reviewData.totalAttempts) * 100
      );
      
      // Get last review or create initial review
      const lastReview = reviewData.reviewHistory.length > 0
        ? reviewData.reviewHistory[reviewData.reviewHistory.length - 1]
        : { interval: 1, repetitions: 0 };
      
      // Only calculate new review for correct answers
      if (isCorrect) {
        const newReviewData = calculateNextReview(lastReview, difficulty);
        
        // Add new review to history
        reviewData.reviewHistory.push({
          date: new Date().toISOString(),
          difficulty,
          interval: newReviewData.interval,
          repetitions: newReviewData.repetitions
        });
        
        // Set next review date
        reviewData.nextReviewDate = new Date(
          Date.now() + (newReviewData.interval * 24 * 60 * 60 * 1000)
        ).toISOString();
      }
      
      // Save updated review data
      transaction.set(reviewRef, reviewData, { merge: true });
      
      return reviewData;
    });
  } catch (error) {
    console.error("Error in review question:", error);
  }
}

// Fetch questions due for review
async function getQuestionsForReview() {
  const userId = window.auth.currentUser.uid;
  const now = new Date().toISOString();
  
  try {
    const reviewsQuery = window.query(
      window.collection(window.db, 'userReviews'),
      window.where('userId', '==', userId),
      window.where('nextReviewDate', '<=', now)
    );
    
    const querySnapshot = await window.getDocs(reviewsQuery);
    
    const questionsToReview = [];
    querySnapshot.forEach(doc => {
      questionsToReview.push(doc.data());
    });
    
    return questionsToReview;
  } catch (error) {
    console.error("Error fetching review questions:", error);
    return [];
  }
}

// Difficulty selection modal
function createDifficultyModal(questionId, isCorrect) {
  // Remove any existing modals
  const existingModal = document.getElementById('difficultyModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'difficultyModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '2000';
  
  modal.innerHTML = `
    <div style="background:white; padding:20px; border-radius:10px; text-align:center;">
      <h3>How difficult was this question?</h3>
      <button data-difficulty="easy" style="margin:10px; padding:10px; background-color:green; color:white; border:none; border-radius:5px;">Easy</button>
      <button data-difficulty="medium" style="margin:10px; padding:10px; background-color:orange; color:white; border:none; border-radius:5px;">Medium</button>
      <button data-difficulty="hard" style="margin:10px; padding:10px; background-color:red; color:white; border:none; border-radius:5px;">Hard</button>
    </div>
  `;
  
  // Add event listeners to difficulty buttons
  modal.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', async () => {
      const difficulty = button.dataset.difficulty;
      
      // Record the review
      await reviewQuestion(questionId, isCorrect, difficulty);
      
      // Remove modal
      modal.remove();
    });
  });
  
  // Only show for correct answers
  if (isCorrect) {
    document.body.appendChild(modal);
  }
}

// Start a review quiz
async function startReviewQuiz() {
  const reviewQuestions = await getQuestionsForReview();
  
  if (reviewQuestions.length === 0) {
    alert("No questions due for review right now!");
    return;
  }
  
  // Load review questions
  loadQuestions({
    type: 'review',
    questions: reviewQuestions.map(r => r.questionId)
  });
}
</parameter>
</invoke>
