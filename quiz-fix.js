// This is a quick fix for the quiz functionality
console.log("Quick fix script loaded");

// Define a simplified version of loadQuestions
window.loadQuestions = function(options) {
  console.log("Quick-fix loadQuestions called with options:", options);
  
  // Extract options
  const category = options.category || "";
  const numQuestions = options.num || 10;
  const includeAnswered = options.includeAnswered || false;
  const isReviewQuestion = options.isReviewQuestion || false;
  
  // Log what we're doing
  console.log(`Starting a ${options.type || "random"} quiz with ${numQuestions} questions`);
  if (category) console.log(`Category filter: ${category}`);
  console.log(`Include answered questions: ${includeAnswered}`);
  
  // Try to use Papa Parse to load the questions
  if (typeof Papa !== 'undefined' && typeof Papa.parse === 'function') {
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ85bci-l8eImMlvV2Vw8LqnTpmSVoTqbZFscvQ5w6ptGZzb5q1DLyeFS7uIqoLtEw4lXLQohCfofXd/pub?output=csv";
    
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: function(results) {
        console.log("Questions loaded:", results.data.length);
        
        // Filter the questions according to options
        let filteredQuestions = results.data;
        
        // Shuffle the questions
        filteredQuestions = shuffleQuestions(filteredQuestions);
        
        // Limit to requested number
        if (numQuestions && numQuestions < filteredQuestions.length) {
          filteredQuestions = filteredQuestions.slice(0, numQuestions);
        }
        
        // Initialize the quiz with these questions
        console.log("Starting quiz with", filteredQuestions.length, "questions");
        initSimpleQuiz(filteredQuestions);
      },
      error: function(error) {
        console.error("Error parsing CSV:", error);
        alert("There was an error loading the questions. Please try again.");
      }
    });
  } else {
    console.error("Papa Parse not available");
    alert("Quiz functionality is not fully loaded. Please refresh the page and try again.");
  }
};

// Simple function to shuffle an array
function shuffleQuestions(array) {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  
  // Create a copy of the array to avoid modifying the original
  const shuffled = [...array];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// A simple quiz initializer
function initSimpleQuiz(questions) {
  console.log("Initializing simple quiz");
  
  // Hide the main options and show the quiz container
  const mainOptions = document.getElementById("mainOptions");
  if (mainOptions) mainOptions.style.display = "none";
  
  // Get or create the quiz container
  let quizContainer = document.getElementById("quizContainer");
  if (!quizContainer) {
    quizContainer = document.createElement("div");
    quizContainer.id = "quizContainer";
    quizContainer.style.padding = "20px";
    quizContainer.style.marginTop = "60px";
    document.body.appendChild(quizContainer);
  }
  
  // Clear the container
  quizContainer.innerHTML = "";
  
  // Show the first question
  if (questions.length > 0) {
    showQuestion(questions, 0, quizContainer);
  } else {
    quizContainer.innerHTML = "<h2>No questions available</h2><p>Please try different filters.</p>";
    
    // Add a back button
    const backButton = document.createElement("button");
    backButton.textContent = "Back to Menu";
    backButton.style.padding = "10px 20px";
    backButton.style.margin = "20px 0";
    backButton.style.backgroundColor = "#0056b3";
    backButton.style.color = "white";
    backButton.style.border = "none";
    backButton.style.borderRadius = "4px";
    backButton.style.cursor = "pointer";
    
    backButton.onclick = function() {
      quizContainer.style.display = "none";
      if (mainOptions) mainOptions.style.display = "flex";
    };
    
    quizContainer.appendChild(backButton);
  }
}

// Show a specific question
function showQuestion(questions, index, container) {
  const question = questions[index];
  
  // Create the question card
  const card = document.createElement("div");
  card.className = "question-card";
  card.style.backgroundColor = "#fff";
  card.style.borderRadius = "8px";
  card.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
  card.style.padding = "20px";
  card.style.marginBottom = "20px";
  
  // Question text
  const questionText = document.createElement("div");
  questionText.className = "question-text";
  questionText.style.fontSize = "1.2rem";
  questionText.style.fontWeight = "500";
  questionText.style.marginBottom = "20px";
  questionText.textContent = question["Question"];
  card.appendChild(questionText);
  
  // Image if available
  if (question["Image URL"] && question["Image URL"].trim() !== "") {
    const image = document.createElement("img");
    image.src = question["Image URL"].trim();
    image.style.maxWidth = "100%";
    image.style.marginBottom = "20px";
    image.style.borderRadius = "4px";
    card.appendChild(image);
  }
  
  // Options
  const options = ["A", "B", "C", "D", "E"];
  options.forEach(option => {
    if (question[`Option ${option}`] && question[`Option ${option}`].trim() !== "") {
      const button = document.createElement("button");
      button.className = "option-button";
      button.dataset.option = option;
      button.textContent = `${option}. ${question[`Option ${option}`]}`;
      button.style.display = "block";
      button.style.width = "100%";
      button.style.padding = "10px";
      button.style.marginBottom = "10px";
      button.style.textAlign = "left";
      button.style.backgroundColor = "#f0f0f0";
      button.style.border = "1px solid #ddd";
      button.style.borderRadius = "4px";
      button.style.cursor = "pointer";
      
      // Add hover effect
      button.onmouseover = function() {
        this.style.backgroundColor = "#e0e0e0";
      };
      button.onmouseout = function() {
        this.style.backgroundColor = "#f0f0f0";
      };
      
      // Add click handler
      button.onclick = function() {
        handleAnswer(this, question, questions, index, container);
      };
      
      card.appendChild(button);
    }
  });
  
  // Progress indicator
  const progress = document.createElement("div");
  progress.className = "progress-indicator";
  progress.style.textAlign = "center";
  progress.style.marginTop = "20px";
  progress.style.color = "#666";
  progress.textContent = `Question ${index + 1} of ${questions.length}`;
  card.appendChild(progress);
  
  // Add the card to the container
  container.innerHTML = "";
  container.appendChild(card);
}

// Handle an answer selection
function handleAnswer(button, question, questions, index, container) {
  // Disable all buttons
  const buttons = container.querySelectorAll(".option-button");
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.cursor = "default";
    btn.onmouseover = null;
    btn.onmouseout = null;
  });
  
  // Get selected option and correct option
  const selectedOption = button.dataset.option;
  const correctOption = question["Correct Answer"].trim();
  const isCorrect = selectedOption === correctOption;
  
  // Highlight correct and incorrect answers
  buttons.forEach(btn => {
    if (btn.dataset.option === correctOption) {
      btn.style.backgroundColor = "#28a745";
      btn.style.color = "white";
    } else if (btn.dataset.option === selectedOption && !isCorrect) {
      btn.style.backgroundColor = "#dc3545";
      btn.style.color = "white";
    }
  });
  
  // Show explanation
  const explanation = document.createElement("div");
  explanation.className = "explanation";
  explanation.style.marginTop = "20px";
  explanation.style.padding = "15px";
  explanation.style.backgroundColor = "#f8f9fa";
  explanation.style.borderRadius = "4px";
  explanation.style.borderLeft = `4px solid ${isCorrect ? "#28a745" : "#dc3545"}`;
  
  explanation.innerHTML = `
    <strong>${isCorrect ? "Correct!" : "Incorrect!"}</strong><br>
    <strong>Explanation:</strong> ${question["Explanation"] || "No explanation provided."}
  `;
  
  container.querySelector(".question-card").appendChild(explanation);
  
  // Add next button if not the last question
  if (index < questions.length - 1) {
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next Question";
    nextButton.style.display = "block";
    nextButton.style.margin = "20px auto 0 auto";
    nextButton.style.padding = "10px 20px";
    nextButton.style.backgroundColor = "#0056b3";
    nextButton.style.color = "white";
    nextButton.style.border = "none";
    nextButton.style.borderRadius = "4px";
    nextButton.style.cursor = "pointer";
    
    nextButton.onclick = function() {
      showQuestion(questions, index + 1, container);
    };
    
    container.querySelector(".question-card").appendChild(nextButton);
  } else {
    // Show quiz completion message
    const completionMessage = document.createElement("div");
    completionMessage.className = "completion-message";
    completionMessage.style.marginTop = "20px";
    completionMessage.style.textAlign = "center";
    completionMessage.style.padding = "15px";
    completionMessage.style.backgroundColor = "#f0f8ff";
    completionMessage.style.borderRadius = "4px";
    
    completionMessage.innerHTML = `
      <h3>Quiz Complete!</h3>
      <p>You've completed all the questions.</p>
    `;
    
    container.querySelector(".question-card").appendChild(completionMessage);
    
    // Add back to menu button
    const backButton = document.createElement("button");
    backButton.textContent = "Back to Menu";
    backButton.style.display = "block";
    backButton.style.margin = "20px auto 0 auto";
    backButton.style.padding = "10px 20px";
    backButton.style.backgroundColor = "#0056b3";
    backButton.style.color = "white";
    backButton.style.border = "none";
    backButton.style.borderRadius = "4px";
    backButton.style.cursor = "pointer";
    
    backButton.onclick = function() {
      container.style.display = "none";
      const mainOptions = document.getElementById("mainOptions");
      if (mainOptions) mainOptions.style.display = "flex";
    };
    
    container.querySelector(".question-card").appendChild(backButton);
  }
}

// Log that the quick fix is ready
console.log("Quick fix script loaded and loadQuestions is available:", typeof window.loadQuestions === 'function');
