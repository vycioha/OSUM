import { dropdownOptions } from "./dropdownOptions.js"; // adjust the path according to your directory structure

document
  .getElementById("software-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    let softwareInput = document.getElementById("software-input").value;

    document.getElementById("loading-animation").style.display = "block";

    // Call your backend with the software name, update the CPE dropdown when data returns
    fetch("http://localhost:5000/api/v1/cpe_search?keyword=" + softwareInput)
      .then((response) => response.json())
      .then((data) => {
        let select = document.getElementById("cpe-select");
        // Remove old options
        select.innerHTML = "";
        // Add new options
        data.forEach((cpe) => {
          console.log(cpe);
          let option = document.createElement("option");
          option.text = cpe.cpeName;
          option.value = cpe.cpeName; // Assuming you want to use the CPE name as the value
          select.add(option);
        });

        // Hide the loading message after data is loaded
        document.getElementById("loading-animation").style.display = "none";
        document.getElementById("cpe-picker").style.display = "block";
      });
  });

function generateDescriptionCell(descriptionValue, rowIndex) {
  // Create a select element with options
  let select = document.createElement("select");
  select.classList.add("form-control2");

  // Add a default option that retains the original description value
  let defaultOption = document.createElement("option");
  defaultOption.text = descriptionValue;
  defaultOption.selected = true; // Set the default option as selected
  select.add(defaultOption);

  // Add other options from the dropdownOptions array
  dropdownOptions.forEach((optionText) => {
    let option = document.createElement("option");
    option.text = optionText;
    select.add(option);
  });

  // Add event listener to the select element to update the description value
  select.addEventListener("change", function () {
    if (select.value !== descriptionValue) {
      // Save the old value before changing it
      undoStack[rowIndex] = undoStack[rowIndex] || [];
      undoStack[rowIndex].push(descriptionValue);

      // Then proceed as before
      descriptionValue = select.value;
      let newText = document.createTextNode(descriptionValue);
      select.parentNode.replaceChild(newText, select);
    }
  });

  // Return the HTML markup for the select element
  return select;
}
let undoStack = {};

document
  .getElementById("generate-button")
  .addEventListener("click", function () {
    let cpeId = document.getElementById("cpe-select").value;
    let softwareInput = document.getElementById("software-input").value;
    let resultsperpage = document.getElementById("results-per-page").value;

    document.getElementById("loading-animation").style.display = "block";

    // Call the NVD API with the CPE name, update the CVE table when data returns
    fetch(
      "https://services.nvd.nist.gov/rest/json/cves/1.0?cpeMatchString=" +
        cpeId +
        "&resultsPerPage=" +
        resultsperpage
    )
      .then((response) => response.json())
      .then((data) => {
        console.log(data); // Log the data received from the API

        if (data.result.CVE_Items) {
          // Check if vulnerabilities exist
          let tbody = document
            .getElementById("cve-table")
            .querySelector("tbody");

          // Remove old rows
          tbody.innerHTML = "";

          // Add new rows
          data.result.CVE_Items.forEach((item, index) => {
            let tr = document.createElement("tr");
            let description = item.cve.description.description_data.find(
              (desc) => desc.lang === "en"
            );

            let baseScore = "N/A";
            let baseSeverity = "N/A";

            if (item.impact.baseMetricV3) {
              baseScore = item.impact.baseMetricV3.cvssV3.baseScore;
              baseSeverity = item.impact.baseMetricV3.cvssV3.baseSeverity;
            } else if (item.impact.baseMetricV2) {
              baseScore = item.impact.baseMetricV2.cvssV2.baseScore;
              baseSeverity = item.impact.baseMetricV2.severity;
            }
            tr.innerHTML = `<td>${softwareInput}</td><td>${
              item.cve.CVE_data_meta.ID
            }</td><td></td><td>${baseScore} (${
              baseSeverity.charAt(0).toUpperCase() +
              baseSeverity.slice(1).toLowerCase()
            })</td>`;
            let cell = tr.cells[2];
            cell.appendChild(generateDescriptionCell(description.value, index));

            tbody.appendChild(tr);

            let undoButton = document.createElement("button");
            undoButton.textContent = "   X";
            undoButton.classList.add("undo-button");
            undoButton.addEventListener("click", function () {
              if (undoStack[index] && undoStack[index].length > 0) {
                let lastValue = undoStack[index].pop();
                cell.innerHTML = "";
                cell.appendChild(generateDescriptionCell(lastValue, index));
              }
            });
            tr.appendChild(undoButton);
          });
        } else {
          console.error("No vulnerabilities in data");
        }
        document.getElementById("loading-animation").style.display = "none";
        document.getElementById("table-container").style.display = "block";
      });
  });

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("copy-button").addEventListener("click", function () {
    // Create a new HTML document
    let newDoc = window.open("", "_blank");

    // Write the table into the new document with center alignment
    newDoc.document.write(`
            <html>
                <head>
                    <link rel="stylesheet" href="styles.css">
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
});

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
      li.textContent = `${entry.software}  ${entry.cpe} `;
      const dateSpan = document.createElement("span");
      dateSpan.classList.add("history-date");
      dateSpan.textContent = `Date: ${entry.date}`;
      li.appendChild(dateSpan);

      ul.appendChild(li);

      li.addEventListener("click", function () {
        // Show the iframe and the backdrop
        iframe.style.display = "block";
        backdrop.style.display = "block";

        iframe.addEventListener("load", function () {
          let doc = iframe.contentWindow || iframe.contentDocument;
          if (doc.document) {
            doc = doc.document;
          }
          doc.open();
          doc.write(
            '<html><head><title>Table</title><link rel="stylesheet" href="styles.css"></head><body style="display: flex; justify-content: center; align-items: center;">' +
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

// Event listener for the remember button
document
  .getElementById("remember-button")
  .addEventListener("click", function () {
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
document.addEventListener("DOMContentLoaded", function () {
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
backdrop.addEventListener("click", function () {
  iframe.style.display = "none";
  backdrop.style.display = "none";
});

// Add event listener to toggle history button
document
  .getElementById("toggle-history-button")
  .addEventListener("click", function () {
    let historyBar = document.getElementById("history-bar");
    historyBar.classList.toggle("show-sidebar");
  });

document.getElementById("export-button").addEventListener("click", function () {
  let tableData = document.getElementById("cve-table").outerHTML;
  let blob = new Blob([tableData], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  saveAs(blob, "table.docx");
});

document
  .getElementById("search-input")
  .addEventListener("input", updateHistoryBar);

// ----------------------------------
