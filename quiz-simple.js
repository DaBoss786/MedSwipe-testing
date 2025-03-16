// Simplified quiz.js that focuses on the core functionality
console.log("Loading simplified quiz.js");

// Define a basic loadQuestions function
function loadQuestions(options = {}) {
  console.log("loadQuestions called with options:", options);
  
  // Extract options
  const category = options.category || "";
  const numQuestions = options.num || 10;
  const includeAnswered = options.includeAnswered || false;
  
  // Show a basic quiz interface
  const mainOptions = document.getElementById("mainOptions");
  if (mainOptions) {
    mainOptions.style.display = "none";
    
    // Create a simple quiz container
    const quizDiv = document.createElement("div");
    quizDiv.id = "simpleQuizContainer";
    quizDiv.style.textAlign = "center";
    quizDiv.style.marginTop = "50px";
    quizDiv.innerHTML = "<h2>Quiz Started</h2><p>Quiz options: " + 
      JSON.stringify(options) + "</p>";
    document.body.appendChild(quizDiv);
    
    // Add a back button
    const backButton = document.createElement("button");
    backButton.textContent = "Back to Menu";
    backButton.style.padding = "10px 20px";
    backButton.style.margin = "20px";
    backButton.style.backgroundColor = "#0056b3";
    backButton.style.color = "white";
    backButton.style.border = "none";
    backButton.style.borderRadius = "4px";
    backButton.style.cursor = "pointer";
    
    backButton.onclick = function() {
      quizDiv.remove();
      if (mainOptions) mainOptions.style.display = "flex";
    };
    
    quizDiv.appendChild(backButton);
  }
}

// Make sure this is attached to the window object immediately
window.loadQuestions = loadQuestions;
console.log("Simplified quiz.js: loadQuestions attached to window object:", 
           typeof window.loadQuestions === 'function');
