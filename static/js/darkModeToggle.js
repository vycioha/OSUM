// Function to toggle dark mode
function toggleDarkMode() {
    var darkModeButton = document.querySelector('#darkModeButton');
    var isDarkMode = document.body.classList.contains('dark-mode');
  
    // Toggle dark mode class
    document.body.classList.toggle('dark-mode');
  
    // Toggle the icon
    if (isDarkMode) {
      darkModeButton.classList.remove('fa-sun');
      darkModeButton.classList.add('fa-moon');
    } else {
      darkModeButton.classList.remove('fa-moon');
      darkModeButton.classList.add('fa-sun');
    }
  
    // Update dark mode status in localStorage
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('darkMode', 'enabled');
    } else {
      localStorage.setItem('darkMode', 'disabled');
    }
  }
  
  // Event listener for dark mode button
  document.querySelector('#darkModeButton').addEventListener('click', toggleDarkMode);
  
  // On page load, check if dark mode is enabled in localStorage
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    var darkModeButton = document.querySelector('#darkModeButton');
    darkModeButton.classList.remove('fa-moon');
    darkModeButton.classList.add('fa-sun');
  }
  