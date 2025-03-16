// Enhanced quiz.js with actual question display
console.log("Loading enhanced quiz-simple.js");

// Global quiz variables
let currentQuestionIndex = 0;
let quizQuestions = [];
let score = 0;

// Define the loadQuestions function
function loadQuestions(options = {}) {
  console.log("loadQuestions called with options:", options);
  
  // Create or get quiz container
  let quizContainer = document.getElementById("simpleQuizContainer");
  if (!quizContainer) {
    quizContainer = document.createElement("div");
    quizContainer.id = "simpleQuizContainer";
    quizContainer.style.padding = "20px";
    quizContainer.style.marginTop = "60px";
    document.body.appendChild(quizContainer);
  }
  
  // Hide main options
  const mainOptions = document.getElementById("mainOptions");
  if (mainOptions) {
    mainOptions.style.display = "none";
  }
  
  // First, check if Papa is available
  if (typeof Papa === 'undefined') {
    console.log("PapaParse not found, adding it to the page");
    
    // Show loading message
    quizContainer.innerHTML = `
      <div style="text-align:center;">
        <h2>Loading Quiz Resources...</h2>
        <p>Please wait while we prepare the quiz.</p>
      </div>
    `;
    
    // Add PapaParse script
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js";
    script.onload = function() {
      console.log("PapaParse loaded successfully");
      startFetchingQuestions(options, quizContainer);
    };
    script.onerror = function() {
      console.error("Failed to load PapaParse");
      quizContainer.innerHTML = `
        <div style="text-align:center;">
          <h2>Error Loading Quiz</h2>
          <p>There was a problem loading the quiz resources. Please try again later.</p>
          <button onclick="document.getElementById('simpleQuizContainer').style.display='none'; document.getElementById('mainOptions').style.display='flex';" 
                  style="padding:10px 20px; background-color:#0056b3; color:white; border:none; border-radius:4px; cursor:pointer; margin-top:15px;">
            Back to Menu
          </button>
        </div>
      `;
    };
    document.head.appendChild(script);
  } else {
    // Papa is available, start directly
    startFetchingQuestions(options, quizContainer);
  }
}

// Function to start fetching questions once Papa is available
function startFetchingQuestions(options, container) {
  // Show loading message
  container.innerHTML = `
    <div style="text-align:center;">
      <h2>Loading Questions...</h2>
      <p>Please wait while we fetch the quiz questions.</p>
    </div>
  `;
  
  // Set up test questions (in case CSV loading fails)
  const testQuestions = [
    {
      "Question": "Which cranial nerve is responsible for hearing?",
      "Option A": "Facial nerve (CN VII)",
      "Option B": "Vestibulocochlear nerve (CN VIII)",
      "Option C": "Glossopharyngeal nerve (CN IX)",
      "Option D": "Vagus nerve (CN X)",
      "Correct Answer": "B",
      "Explanation": "The vestibulocochlear nerve (CN VIII) is responsible for transmitting sound information from the inner ear to the brain, as well as sending balance and spatial orientation information."
    },
    {
      "Question": "What is the function of the eustachian tube?",
      "Option A": "Drains the middle ear",
      "Option B": "Equalizes air pressure between middle ear and pharynx",
      "Option C": "Connects the inner ear to the brain",
      "Option D": "Amplifies sound waves",
      "Correct Answer": "B",
      "Explanation": "The eustachian tube connects the middle ear to the nasopharynx, allowing air pressure to equalize between the middle ear and the outside environment."
    }
  ];
  
  // Try to fetch questions from CSV
  try {
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ85bci-l8eImMlvV2Vw8LqnTpmSVoTqbZFscvQ5w6ptGZzb5q1DLyeFS7uIqoLtEw4lXLQohCfofXd/pub?output=csv";
    
    console.log("Starting CSV fetch attempt");
    
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: function(results) {
        console.log("CSV parsed successfully", results);
        if (results.data && results.data.length > 0) {
          processQuestions(results.data, options, container);
        } else {
          console.log("CSV parsing returned empty data, using test questions");
          processQuestions(testQuestions, options, container);
        }
      },
      error: function(error) {
        console.error("Error parsing CSV:", error);
        console.log("Using test questions instead");
        processQuestions(testQuestions, options, container);
      }
    });
  } catch (e) {
    console.error("Exception during CSV parsing:", e);
    console.log("Using test questions instead");
    processQuestions(testQuestions, options, container);
  }
}

// Process and display questions
function processQuestions(questions, options, container) {
  console.log("Processing questions:", questions.length);
  
  // Filter valid questions
  let validQuestions = questions.filter(q => 
    q["Question"] && 
    q["Question"].trim() !== "" && 
    q["Correct Answer"] && 
    q["Correct Answer"].trim() !== ""
  );
  
  // Apply category filter if specified
  if (options.category && options.category !== "") {
    validQuestions = validQuestions.filter(q => q["Category"] === options.category);
  }
  
  // Shuffle questions
  validQuestions = shuffleArray(validQuestions);
  
  // Limit to requested number
  const numQuestions = options.num || 10;
  if (numQuestions < validQuestions.length) {
    validQuestions = validQuestions.slice(0, numQuestions);
  }
  
  // Save to global variables
  quizQuestions = validQuestions;
  currentQuestionIndex = 0;
  score = 0;
  
  console.log("Final question count:", quizQuestions.length);
  
  // Show first question or no questions message
  if (quizQuestions.length > 0) {
    showQuestion(container);
  } else {
    container.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <h2>No Questions Available</h2>
        <p>No questions match your criteria. Try different options.</p>
        <button onclick="document.getElementById('simpleQuizContainer').style.display='none'; document.getElementById('mainOptions').style.display='flex';"
                style="padding:10px 20px; background-color:#0056b3; color:white; border:none; border-radius:4px; cursor:pointer; margin-top:20px;">
          Back to Menu
        </button>
      </div>
    `;
  }
}

// Function to show the current question
function showQuestion(container) {
  const question = quizQuestions[currentQuestionIndex];
  
  console.log("Showing question:", currentQuestionIndex + 1);
  
  // Create question card
  let html = `
    <div style="max-width:800px; margin:0 auto;">
      <div style="background-color:#fff; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.1); padding:20px; margin-bottom:20px;">
        <div style="text-align:center; color:#666; margin-bottom:10px;">
          Question ${currentQuestionIndex + 1} of ${quizQuestions.length}
        </div>
        <div style="font-size:1.2rem; font-weight:500; margin-bottom:20px;">
          ${question["Question"]}
        </div>
  `;
  
  // Add image if available
  if (question["Image URL"] && question["Image URL"].trim() !== "") {
    html += `
      <div style="margin-bottom:20px; text-align:center;">
        <img src="${question["Image URL"].trim()}" style="max-width:100%; border-radius:4px;" alt="Question Image">
      </div>
    `;
  }
  
  // Add options
  html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
  
  const options = ["A", "B", "C", "D", "E"];
  options.forEach(option => {
    if (question[`Option ${option}`] && question[`Option ${option}`].trim() !== "") {
      html += `
        <button onclick="handleAnswer('${option}')" 
                style="padding:12px; text-align:left; background-color:#f0f0f0; border:1px solid #ddd; border-radius:4px; cursor:pointer; font-size:1rem;">
          ${option}. ${question[`Option ${option}`]}
        </button>
      `;
    }
  });
  
  html += `</div>`;
  html += `</div>`;
  
  // Display progress
  html += `
    <div style="width:100%; height:10px; background-color:#ddd; border-radius:5px; margin:20px 0;">
      <div style="width:${(currentQuestionIndex / quizQuestions.length) * 100}%; height:100%; background-color:#0056b3; border-radius:5px;"></div>
    </div>
    <div style="text-align:right; color:#0056b3; font-weight:500;">
      Score: ${score}/${currentQuestionIndex}
    </div>
  `;
  
  // Set the HTML
  container.innerHTML = html;
  
  // Add global function to handle answer clicks
  window.handleAnswer = function(selectedOption) {
    handleAnswerInternal(selectedOption, container);
  };
}

// Function to handle when an answer is selected
function handleAnswerInternal(selectedOption, container) {
  const question = quizQuestions[currentQuestionIndex];
  const correctOption = question["Correct Answer"].trim();
  const isCorrect = selectedOption === correctOption;
  
  console.log("Answer selected:", selectedOption, "Correct:", isCorrect);
  
  // Update score
  if (isCorrect) {
    score++;
  }
  
  // Create explanation HTML
  let html = `
    <div style="max-width:800px; margin:0 auto;">
      <div style="background-color:#fff; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.1); padding:20px; margin-bottom:20px;">
        <div style="text-align:center; color:#666; margin-bottom:10px;">
          Question ${currentQuestionIndex + 1} of ${quizQuestions.length}
        </div>
        <div style="font-size:1.2rem; font-weight:500; margin-bottom:20px;">
          ${question["Question"]}
        </div>
  `;
  
  // Add image if available
  if (question["Image URL"] && question["Image URL"].trim() !== "") {
    html += `
      <div style="margin-bottom:20px; text-align:center;">
        <img src="${question["Image URL"].trim()}" style="max-width:100%; border-radius:4px;" alt="Question Image">
      </div>
    `;
  }
  
  // Add options with highlighting
  html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
  
  const options = ["A", "B", "C", "D", "E"];
  options.forEach(option => {
    if (question[`Option ${option}`] && question[`Option ${option}`].trim() !== "") {
      let backgroundColor = "#f0f0f0";
      let color = "#000";
      let borderColor = "#ddd";
      
      if (option === correctOption) {
        backgroundColor = "#28a745";
        color = "#fff";
        borderColor = "#28a745";
      } else if (option === selectedOption && !isCorrect) {
        backgroundColor = "#dc3545";
        color = "#fff";
        borderColor = "#dc3545";
      }
      
      html += `
        <button disabled 
                style="padding:12px; text-align:left; background-color:${backgroundColor}; color:${color}; border:1px solid ${borderColor}; border-radius:4px; font-size:1rem;">
          ${option}. ${question[`Option ${option}`]}
        </button>
      `;
    }
  });
  
  html += `</div>`;
  
  // Add explanation
  html += `
    <div style="margin-top:20px; padding:15px; background-color:#f8f9fa; border-radius:4px; border-left:4px solid ${isCorrect ? "#28a745" : "#dc3545"};">
      <div style="font-weight:bold; margin-bottom:5px;">${isCorrect ? "Correct!" : "Incorrect!"}</div>
      <div style="margin-bottom:10px;"><strong>Correct Answer:</strong> ${correctOption}</div>
      <div><strong>Explanation:</strong> ${question["Explanation"] || "No explanation provided."}</div>
    </div>
  `;
  
  // Close card div
  html += `</div>`;
  
  // Display progress
  html += `
    <div style="width:100%; height:10px; background-color:#ddd; border-radius:5px; margin:20px 0;">
      <div style="width:${(currentQuestionIndex / quizQuestions.length) * 100}%; height:100%; background-color:#0056b3; border-radius:5px;"></div>
    </div>
    <div style="text-align:right; color:#0056b3; font-weight:500;">
      Score: ${score}/${currentQuestionIndex + 1}
    </div>
  `;
  
  // Add next button or completion message
  if (currentQuestionIndex < quizQuestions.length - 1) {
    html += `
      <div style="text-align:center; margin-top:20px;">
        <button onclick="nextQuestion()" 
                style="padding:10px 20px; background-color:#0056b3; color:white; border:none; border-radius:4px; cursor:pointer;">
          Next Question
        </button>
      </div>
    `;
  } else {
    html += `
      <div style="text-align:center; margin-top:20px;">
        <div style="margin-bottom:20px; padding:15px; background-color:#f0f8ff; border-radius:8px; border:1px solid #b8daff;">
          <h3 style="margin-top:0;">Quiz Complete!</h3>
          <p>Your final score: ${score}/${quizQuestions.length} (${Math.round((score/quizQuestions.length) * 100)}%)</p>
          <p>${score/quizQuestions.length >= 0.7 ? 'Great job!' : 'Keep practicing to improve!'}</p>
        </div>
        <button onclick="backToMenu()" 
                style="padding:10px 20px; background-color:#0056b3; color:white; border:none; border-radius:4px; cursor:pointer;">
          Back to Menu
        </button>
      </div>
    `;
  }
  
  // Set the HTML
  container.innerHTML = html;
  
  // Add global function for next question
  window.nextQuestion = function() {
    currentQuestionIndex++;
    showQuestion(container);
  };
  
  // Add global function for back to menu
  window.backToMenu = function() {
    container.style.display = "none";
    const mainOptions = document.getElementById("mainOptions");
    if (mainOptions) mainOptions.style.display = "flex";
  };
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
