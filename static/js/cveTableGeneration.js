import { dropdownOptions } from "./dropdownOptions.js"; // adjust the path according to your directory structure

document
    .getElementById("generate-button")
    .addEventListener("click", function() {
        let cpeId = document.getElementById("cpe-select").value;
        let softwareInput = document.getElementById("software-input").value;
        let resultsperpage = document.getElementById("results-per-page").value;

        document.getElementById("loading-animation").style.display = "block";

        fetch(
                "https://services.nvd.nist.gov/rest/json/cves/1.0?cpeMatchString=" +
                cpeId +
                "&resultsPerPage=" +
                resultsperpage
            )
            .then((response) => response.json())
            .then((data) => {
                console.log(data);

                if (data.result.CVE_Items) {
                    let tbody = document
                        .getElementById("cve-table")
                        .querySelector("tbody");

                    tbody.innerHTML = "";

                    data.result.CVE_Items.forEach((item, index) => {
                        let tr = document.createElement("tr");
                        let description = item.cve.description.description_data.find(
                            (desc) => desc.lang === "en"
                        );

                        let baseScore = "N/A";
                        let baseSeverity = "N/A";
                        let vectorString = "N/A";

                        if (item.impact.baseMetricV3) {
                            baseScore = item.impact.baseMetricV3.cvssV3.baseScore;
                            baseSeverity = item.impact.baseMetricV3.cvssV3.baseSeverity;
                            vectorString = item.impact.baseMetricV3.cvssV3.vectorString;
                        } else if (item.impact.baseMetricV2) {
                            baseScore = item.impact.baseMetricV2.cvssV2.baseScore;
                            baseSeverity = item.impact.baseMetricV2.severity;
                            vectorString = item.impact.baseMetricV2.vectorString;
                        }
                        if (document.getElementById("table-checkbox").checked) {
                            tr.innerHTML = `<td>${softwareInput}</td><td>${item.cve.CVE_data_meta.ID
                                }</td><td></td><td>${baseScore} (${baseSeverity.charAt(0).toUpperCase() +
                                baseSeverity.slice(1).toLowerCase()
                                })<br>${vectorString}</td>`;
                        } else {
                            tr.innerHTML = `<td>${softwareInput}</td><td>${item.cve.CVE_data_meta.ID
                                }</td><td></td><td>${baseScore} (${baseSeverity.charAt(0).toUpperCase() +
                                baseSeverity.slice(1).toLowerCase()
                                })</td>`;
                        }
                        let cell = tr.cells[2];
                        cell.appendChild(generateDescriptionCell(description.value, index));

                        tbody.appendChild(tr);

                        let undoButton = document.createElement("button");
                        undoButton.textContent = "   X";
                        undoButton.classList.add("undo-button");
                        undoButton.addEventListener("click", function() {
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



function generateDescriptionCell(descriptionValue, rowIndex) {
    // Create a container element for the tooltip
    let tooltipContainer = document.createElement("div");
    tooltipContainer.classList.add("tooltip-container");

    // Create a select element with options
    let select = document.createElement("select");
    select.classList.add("form-control2");

    // Add a default option that retains the original description value
    let defaultOption = document.createElement("option");
    defaultOption.text = descriptionValue;
    defaultOption.style.wordBreak = "break-word";
    defaultOption.selected = true;
    select.add(defaultOption);

    // Add other options from the dropdownOptions array
    dropdownOptions.forEach((optionText) => {
        let option = document.createElement("option");
        option.text = optionText;
        select.add(option);
    });

    // Set the description value as a data attribute
    select.setAttribute("data-tooltip", descriptionValue);

    // Add event listener to the select element to update the description value
    select.addEventListener("change", function() {
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

    // Append the select element to the tooltip container
    tooltipContainer.appendChild(select);

    // Create a tooltip element
    let tooltip = document.createElement("div");
    tooltip.classList.add("tooltip");
    tooltip.textContent = descriptionValue;
    tooltipContainer.appendChild(tooltip);

    // Add event listeners to show and hide the tooltip
    tooltipContainer.addEventListener("mouseenter", function() {
        tooltip.style.visibility = "visible";
    });

    tooltipContainer.addEventListener("mouseleave", function() {
        tooltip.style.visibility = "hidden";
    });

    // Return the HTML markup for the tooltip container
    return tooltipContainer;
}
let undoStack = {};