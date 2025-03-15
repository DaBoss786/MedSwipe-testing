document.addEventListener('DOMContentLoaded', function() {
  const regularQuizToggle = document.getElementById('regularQuizToggle');
  const reviewQuizToggle = document.getElementById('reviewQuizToggle');
  const regularQuizOption = document.getElementById('regularQuizOption');
  const reviewQuizOption = document.getElementById('reviewQuizOption');
  const modalStartQuiz = document.getElementById('modalStartQuiz');
  const noReviewQuestions = document.getElementById('noReviewQuestions');
  const reviewQuestionsList = document.getElementById('reviewQuestionsList');
  const reviewQuestionsCount = document.getElementById('reviewQuestionsCount');
  const reviewMasteryPercent = document.getElementById('reviewMasteryPercent');

  // Toggle between quiz types
  regularQuizToggle.addEventListener('click', function() {
    regularQuizToggle.classList.add('active');
    reviewQuizToggle.classList.remove('active');
    regularQuizOption.style.display = 'block';
    reviewQuizOption.style.display = 'none';
  });

  reviewQuizToggle.addEventListener('click', function() {
    // Fetch review questions when switching to review mode
    fetchReviewQuestions();
    
    reviewQuizToggle.classList.add('active');
    regularQuizToggle.classList.remove('active');
    regularQuizOption.style.display = 'none';
    reviewQuizOption.style.display = 'block';
  });

  // Fetch and display review questions
  async function fetchReviewQuestions() {
    try {
      const reviewQuestions = await getQuestionsForReview();
      
      // Update review questions count and mastery
      reviewQuestionsCount.textContent = reviewQuestions.length;
      
      // Calculate average mastery
      const averageMastery = reviewQuestions.length > 0
        ? Math.round(
            reviewQuestions.reduce((total, q) => total + (q.masteryScore || 0), 0) / 
            reviewQuestions.length
          )
        : 0;
      reviewMasteryPercent.textContent = averageMastery;

      // Show/hide no questions message
      if (reviewQuestions.length === 0) {
        noReviewQuestions.style.display = 'block';
        reviewQuestionsList.style.display = 'none';
      } else {
        noReviewQuestions.style.display = 'none';
        reviewQuestionsList.style.display = 'block';
        
        // Clear previous list
        reviewQuestionsList.innerHTML = '';
        
        // Populate review questions list
        reviewQuestions.forEach(question => {
          const questionItem = document.createElement('div');
          questionItem.classList.add('review-question-item');
          questionItem.innerHTML = `
            <span class="question-category">${question.category || 'Unknown Category'}</span>
            <span class="question-mastery">${question.masteryScore || 0}%</span>
          `;
          reviewQuestionsList.appendChild(questionItem);
        });
      }
    } catch (error) {
      console.error('Error fetching review questions:', error);
      noReviewQuestions.style.display = 'block';
      noReviewQuestions.textContent = 'Error loading review questions';
    }
  }

  // Start Quiz button logic
  modalStartQuiz.addEventListener('click', function() {
    const isReviewMode = reviewQuizToggle.classList.contains('active');
    
    if (isReviewMode) {
      // Start review quiz
      startReviewQuiz();
    } else {
      // Existing regular quiz logic
      const category = document.getElementById('modalCategorySelect').value;
      const numQuestions = parseInt(document.getElementById('modalNumQuestions').value) || 10;
      const includeAnswered = document.getElementById('modalIncludeAnswered').checked;
      
      loadQuestions({
        type: category ? 'custom' : 'random',
        category: category,
        num: numQuestions,
        includeAnswered: includeAnswered
      });
    }
    
    // Close modal
    document.getElementById('quizSetupModal').style.display = 'none';
  });
});
