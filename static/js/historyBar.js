function updateHistoryBar() {
    let ul = document.getElementById("history-list");
    ul.innerHTML = ""; // Clear old history entries

    let searchQuery = document.getElementById("search-input").value.toLowerCase(); // Get the search query

    tableHistory.forEach((entry, index) => {
        // Check if the entry matches the search query
        if (
            entry.software.toLowerCase().includes(searchQuery) ||
            entry.cpe.toLowerCase().includes(searchQuery)
        ) {
            let li = document.createElement("li");

            let softwareSpan = document.createElement("span");
            softwareSpan.textContent = `${entry.software}`;
            li.appendChild(softwareSpan);

            let cpeSpan = document.createElement("span");
            cpeSpan.textContent = `${entry.cpe}`;
            cpeSpan.style.display = "block"; // This will make the span behave like a block element and move to a new line.
            li.appendChild(cpeSpan);

            const dateSpan = document.createElement("span");
            dateSpan.classList.add("history-date");
            dateSpan.textContent = `Date: ${entry.date}`;
            li.appendChild(dateSpan);


            ul.appendChild(li);

            li.addEventListener("click", function() {
                // Show the iframe and the backdrop
                iframe.style.display = "block";
                backdrop.style.display = "block";

                iframe.addEventListener("load", function() {
                    let doc = iframe.contentWindow || iframe.contentDocument;
                    if (doc.document) {
                        doc = doc.document;
                    }
                    doc.open();
                    doc.write(
                        '<html><head><title>Table</title><link rel="stylesheet" href="/static/css/styles.css"></head><body style="display: flex; justify-content: center; align-items: center;">' +
                        entry.table
                    );
                    doc.close();

                    // Adjust the size of the iframe to fit the content
                    iframe.style.height =
                        iframe.contentWindow.document.body.scrollHeight + "px";
                    iframe.style.width =
                        Math.max(
                            iframe.contentWindow.document.body.scrollWidth,
                            window.innerWidth * 0.8
                        ) + "px";
                });

                // Refresh the iframe's content
                iframe.contentWindow.location.reload();
            });
        }
    });
}

let tableHistory = [];

document
    .getElementById("remember-button")
    .addEventListener("click", function() {
        let currentTime = new Date().toLocaleString(); // Get the current date and time
        let historyEntry = {
            software: document.getElementById("software-input").value,
            table: document.getElementById("cve-table").outerHTML,
            cpe: document.getElementById("cpe-select").value,
            date: currentTime,
        };

        // Add the new history entry to the existing tableHistory
        tableHistory.push(historyEntry);

        // Save the updated history to localStorage
        localStorage.setItem("tableHistory", JSON.stringify(tableHistory));

        // Update the history bar immediately
        updateHistoryBar();
    });

// Event listener when the DOM content is loaded
document.addEventListener("DOMContentLoaded", function() {
    let storedHistory = localStorage.getItem("tableHistory");
    tableHistory = storedHistory ? JSON.parse(storedHistory) : [];
    updateHistoryBar();
});

// Create the iframe and the backdrop outside of the event listener
let iframe = document.createElement("iframe");
iframe.id = "iframe-modal";
document.body.appendChild(iframe);
let backdrop = document.createElement("div");
backdrop.id = "modal-backdrop";
document.body.appendChild(backdrop);

// Add a click event to the backdrop to close the modal
backdrop.addEventListener("click", function() {
    iframe.style.display = "none";
    backdrop.style.display = "none";
});

// Add event listener to toggle history button
document
    .getElementById("toggle-history-button")
    .addEventListener("click", function() {
        let historyBar = document.getElementById("history-bar");
        historyBar.classList.toggle("show-sidebar");
    });

document
    .getElementById("search-input")
    .addEventListener("input", updateHistoryBar);