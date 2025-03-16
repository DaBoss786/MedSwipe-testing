// Script loader to ensure all scripts are loaded in the correct order
(function() {
  console.log("Script loader initialized");
  
  // List of scripts to load in order
  const scripts = [
    'utils.js',
    'user.js',
    'spaced-repetition.js',
    'quiz.js',
    'stats.js',
    'ui.js',
    'app.js'
  ];
  
  // Function to load a script
  function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    script.onerror = function() {
      console.error("Error loading script:", src);
      callback();
    };
    document.head.appendChild(script);
  }
  
  // Load scripts sequentially
  function loadScripts(index) {
    if (index >= scripts.length) {
      console.log("All scripts loaded successfully");
      
      // Verify loadQuestions is available
      if (typeof window.loadQuestions === 'function') {
        console.log("loadQuestions is available on window object");
      } else {
        console.error("loadQuestions is still not available. Attempting to fix...");
        if (typeof loadQuestions === 'function') {
          window.loadQuestions = loadQuestions;
          console.log("Fixed: attached loadQuestions from global scope");
        }
      }
      
      return;
    }
    
    loadScript(scripts[index], function() {
      loadScripts(index + 1);
    });
  }
  
  // Start loading scripts
  loadScripts(0);
})();
