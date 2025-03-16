// Enhanced quiz.js with actual question display
console.log("Loading enhanced quiz-simple.js");

// Global quiz variables
let currentQuestionIndex = 0;
let quizQuestions = [];
let score = 0;

// Define the loadQuestions function
function loadQuestions(options = {}) {
  console.log("loadQuestions called with options:", options);
  
  // Extract options
  const category = options.category || "";
  const numQuestions = options.num || 10;
  const includeAnswered = options.includeAnswered || false;
  
  // Hide the main menu
  const mainOptions = document.getElementById("mainOptions");
  if (mainOptions) {
    mainOptions.style.display = "none";
  }
  
  // Create a quiz container if it doesn't exist
  let quizContainer = document.getElementById("enhancedQuizContainer");
  if (!quizContainer) {
    quizContainer = document.createElement("div");
    quizContainer.id = "enhancedQuizContainer";
    quizContainer.style.maxWidth = "800px";
    quizContainer.style.margin = "70px auto 20px auto";
    quizContainer.style.padding = "20px";
    document.body.appendChild(quizContainer);
  }
  
  // Show loading message
  quizContainer.innerHTML = `
    <div style="text-align:center; padding:20px;">
      <h2>Loading Questions...</h2>
      <p>Please wait while we prepare your quiz.</p>
    </div>
  `;
  
  // Set up the CSV URL
  const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ85bci-l8eImMlvV2Vw8LqnTpmSVoTqbZFscvQ5w6ptGZzb5q1DLyeFS7uIqoLtEw4lXLQohCfofXd/pub?output=csv";
  
  // Use PapaParse to fetch and parse the CSV
  Papa.parse(csvUrl, {
    download: true,
    header: true,
    complete: function(results) {
      console.log("Questions loaded:", results.data.length);
      
      // Filter the questions if needed
      let filteredQuestions = results.data.filter(q => q["Question"] && q["Question"].trim() !== "");
      
      // Apply category filter if specified
      if (category && category !== "") {
        filteredQuestions = filteredQuestions.filter(q => q["Category"] === category);
      }
      
      // Shuffle the questions
      filteredQuestions = shuffleArray(filteredQuestions);
      
      // Limit to the requested number
      if (numQuestions < filteredQuestions.length) {
        filteredQuestions = filteredQuestions.slice(0, numQuestions);
      }
      
      // Save the questions to our global variable
      quizQuestions = filteredQuestions;
      currentQuestionIndex = 0;
      score = 0;
      
      // Show the first question
      if (quizQuestions.length > 0) {
        showQuestion(quizContainer);
      } else {
        quizContainer.innerHTML = `
          <div style="text-align:center; padding:20px;">
            <h2>No Questions Available</h2>
            <p>No questions match your criteria. Try different options.</p>
            <button id="backToMenuBtn" style="padding:10px 20px; background-color:#0056b3; color:white; border:none; border-radius:4px; cursor:pointer; margin-top:20px;">
              Back to Menu
            </button>
          </div>
        `;
        document.getElementById("backToMenuBtn").addEventListener("click", function() {
          quizContainer.style.display = "none";
          if (mainOptions) mainOptions.style.display = "flex";
        });
      }
    },
    error: function(error) {
      console.error("Error parsing CSV:", error);
      quizContainer.innerHTML = `
        <div style="text-align:center; padding:20px;">
          <h2>Error Loading Questions</h2>
          <p>There was a problem loading the quiz questions. Please try again.</p>
          <button id="backToMenuBtn" style="padding:10px 20px; background-color:#0056b3; color:white; border:none; border-radius:4px; cursor:pointer; margin-top:20px;">
            Back to Menu
          </button>
        </div>
      `;
      document.getElementById("backToMenuBtn").addEventListener("click", function() {
        quizContainer.style.display = "none";
        if (mainOptions) mainOptions.style.display = "flex";
      });
    }
  });
}

// Function to show the current question
function showQuestion(container) {
  const question = quizQuestions[currentQuestionIndex];
  
  // Create question card
  let html = `
    <div class="question-card" style="background-color:#fff; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.1); padding:20px; margin-bottom:20px;">
      <div class="question-number" style="text-align:center; color:#666; margin-bottom:10px;">
        Question ${currentQuestionIndex + 1} of ${quizQuestions.length}
      </div>
      <div class="question-text" style="font-size:1.2rem; font-weight:500; margin-bottom:20px;">
        ${question["Question"]}
      </div>
  `;
  
  // Add image if available
  if (question["Image URL"] && question["Image URL"].trim() !== "") {
    html += `
      <div class="question-image" style="margin-bottom:20px; text-align:center;">
        <img src="${question["Image URL"].trim()}" style="max-width:100%; border-radius:4px;" alt="Question Image">
      </div>
    `;
  }
  
  // Add options
  html += `<div class="options" style="display:flex; flex-direction:column; gap:10px;">`;
  
  const options = ["A", "B", "C", "D", "E"];
  options.forEach(option => {
    if (question[`Option ${option}`] && question[`Option ${option}`].trim() !== "") {
      html += `
        <button class="option-btn" data-option="${option}" style="padding:12px; text-align:left; background-color:#f0f0f0; border:1px solid #ddd; border-radius:4px; cursor:pointer; font-size:1rem; transition:background-color 0.2s;">
          ${option}. ${question[`Option ${option}`]}
        </button>
      `;
    }
  });
  
  html += `</div>`;
  html += `</div>`;
  
  // Display progress
  html += `
    <div class="progress-bar-container" style="width:100%; height:10px; background-color:#ddd; border-radius:5px; margin:20px 0;">
      <div class="progress-bar" style="width:${(currentQuestionIndex / quizQuestions.length) * 100}%; height:100%; background-color:#0056b3; border-radius:5px;"></div>
    </div>
    <div class="quiz-score" style="text-align:right; color:#0056b3; font-weight:500;">
      Score: ${score}/${currentQuestionIndex}
    </div>
  `;
  
  // Set the HTML
  container.innerHTML = html;
  
  // Add event listeners to options
  const optionButtons = container.querySelectorAll(".option-btn");
  optionButtons.forEach(button => {
    button.addEventListener("click", function() {
      handleAnswer(this, container);
    });
    
    // Add hover effect
    button.addEventListener("mouseover", function() {
      this.style.backgroundColor = "#e0e0e0";
    });
    
    button.addEventListener("mouseout", function() {
      this.style.backgroundColor = "#f0f0f0";
    });
  });
}

// Function to handle when an answer is selected
function handleAnswer(selectedButton, container) {
  const question = quizQuestions[currentQuestionIndex];
  const selectedOption = selectedButton.dataset.option;
  const correctOption = question["Correct Answer"].trim();
  const isCorrect = selectedOption === correctOption;
  
  // Update score
  if (isCorrect) {
    score++;
  }
  
  // Disable all option buttons
  const optionButtons = container.querySelectorAll(".option-btn");
  optionButtons.forEach(button => {
    button.disabled = true;
    button.style.cursor = "default";
    
    // Remove hover effects
    button.removeEventListener("mouseover", function() {});
    button.removeEventListener("mouseout", function() {});
    
    // Highlight correct and incorrect answers
    const buttonOption = button.dataset.option;
    if (buttonOption === correctOption) {
      button.style.backgroundColor = "#28a745";
      button.style.color = "white";
      button.style.borderColor = "#28a745";
    } else if (buttonOption === selectedOption && !isCorrect) {
      button.style.backgroundColor = "#dc3545";
      button.style.color = "white";
      button.style.borderColor = "#dc3545";
    }
  });
  
  // Show explanation
  const explanationDiv = document.createElement("div");
  explanationDiv.className = "explanation";
  explanationDiv.style.marginTop = "20px";
  explanationDiv.style.padding = "15px";
  explanationDiv.style.backgroundColor = "#f8f9fa";
  explanationDiv.style.borderRadius = "4px";
  explanationDiv.style.borderLeft = `4px solid ${isCorrect ? "#28a745" : "#dc3545"}`;
  
  explanationDiv.innerHTML = `
    <div style="font-weight:bold; margin-bottom:5px;">${isCorrect ? "Correct!" : "Incorrect!"}</div>
    <div style="margin-bottom:10px;"><strong>Correct Answer:</strong> ${correctOption}</div>
    <div><strong>Explanation:</strong> ${question["Explanation"] || "No explanation provided."}</div>
  `;
  
  container.querySelector(".question-card").appendChild(explanationDiv);
  
  // Show next button or quiz completion
  const nextButtonDiv = document.createElement("div");
  nextButtonDiv.style.textAlign = "center";
  nextButtonDiv.style.marginTop = "20px";
  
  if (currentQuestionIndex < quizQuestions.length - 1) {
    // Show next question button
    nextButtonDiv.innerHTML = `
      <button id="nextQuestionBtn" style="padding:10px 20px; background-color:#0056b3; color:white; border:none; border-radius:4px; cursor:pointer;">
        Next Question
      </button>
    `;
    container.appendChild(nextButtonDiv);
    
    document.getElementById("nextQuestionBtn").addEventListener("click", function() {
      currentQuestionIndex++;
      showQuestion(container);
    });
  } else {
    // Show quiz completion
    nextButtonDiv.innerHTML = `
      <div style="margin-bottom:20px; padding:15px; background-color:#f0f8ff; border-radius:8px; border:1px solid #b8daff;">
        <h3 style="margin-top:0;">Quiz Complete!</h3>
        <p>Your final score: ${score}/${quizQuestions.length} (${Math.round((score/quizQuestions.length) * 100)}%)</p>
        <p>${score/quizQuestions.length >= 0.7 ? 'Great job!' : 'Keep practicing to improve!'}</p>
      </div>
      <button id="backToMenuBtn" style="padding:10px 20px; background-color:#0056b3; color:white; border:none; border-radius:4px; cursor:pointer;">
        Back to Menu
      </button>
    `;
    container.appendChild(nextButtonDiv);
    
    document.getElementById("backToMenuBtn").addEventListener("click", function() {
      container.style.display = "none";
      const mainOptions = document.getElementById("mainOptions");
      if (mainOptions) mainOptions.style.display = "flex";
    });
  }
  
  // Update score display
  container.querySelector(".quiz-score").textContent = `Score: ${score}/${currentQuestionIndex + 1}`;
}

// Helper function to shuffle an array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Make sure the function is attached to the window object
window.loadQuestions = loadQuestions;
console.log("Enhanced quiz-simple.js: loadQuestions attached to window object");
