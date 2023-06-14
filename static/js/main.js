import './formSubmission.js';
import './cveTableGeneration.js';
import './historyBar.js';
import './exportAndCopy.js';
import './darkModeToggle.js';

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("copy-button").addEventListener("click", function() {
        // Create a new HTML document
        let newDoc = window.open("", "_blank");

        // Write the table into the new document with center alignment
        newDoc.document.write(`
            <html>
                <head>
                    <link rel="stylesheet" href="/static/css/styles.css">
                    <style>
                        body {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            padding: 0;
                        }
                    </style>
                </head>
                <body>
                    ${document.getElementById("cve-table").outerHTML}
                </body>
            </html>
        `);

        newDoc.document.close(); // Close the new document

        // Retrieve history from localStorage
        let storedHistory = localStorage.getItem("tableHistory");
        tableHistory = storedHistory ? JSON.parse(storedHistory) : [];

        // Update the history bar
        updateHistoryBar();
    });

    // Add event listener to adjust iframe size
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
        iframes[i].addEventListener('load', function() {
            this.style.height = this.contentWindow.document.body.scrollHeight + 'px';
        });
    }
});