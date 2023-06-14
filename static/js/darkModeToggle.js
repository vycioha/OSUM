document.querySelector('#darkModeButton').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    // Switch the icon
    if (this.classList.contains('fas') && this.classList.contains('fa-moon')) {
        this.classList.remove('fa-moon');
        this.classList.add('fa-sun');
    } else {
        this.classList.remove('fa-sun');
        this.classList.add('fa-moon');
    }

    // Update dark mode status in localStorage
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
    } else {
        localStorage.setItem('darkMode', 'disabled');
    }
});

// On page load, check if dark mode is enabled in localStorage
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    var darkModeButton = document.querySelector('#darkModeButton');
    darkModeButton.classList.remove('fa-moon');
    darkModeButton.classList.add('fa-sun');
}