import { dropdownOptions, aliases } from "./dropdownOptions.js"; // adjust the path according to your directory structure

document.getElementById("generate-button").addEventListener("click", function() {
    let cpeId = document.getElementById("cpe-select").value;
    let softwareInput = document.getElementById("software-input").value;
    let resultsperpage = document.getElementById("results-per-page").value;
    let sortingCheckedRating = document.getElementById("sort-checkbox-rating").checked;
    let sortingCheckedDate = document.getElementById("sort-checkbox-date").checked;
    let resultsPerPageQuery = (!sortingCheckedRating && !sortingCheckedDate) ? "&resultsPerPage=" + resultsperpage : "";
    let appendChecked = document.getElementById("append-checkbox").checked;
    let tbody = document.getElementById("cve-table").querySelector("tbody");

    if (!appendChecked) {
        tbody.innerHTML = "";
    }

    document.getElementById("sort-checkbox-rating").addEventListener("change", function() {
        if (this.checked) {
            document.getElementById("sort-checkbox-date").checked = false;
        }
    });

    document.getElementById("sort-checkbox-date").addEventListener("change", function() {
        if (this.checked) {
            document.getElementById("sort-checkbox-rating").checked = false;
        }
    });


    document.getElementById("loading-animations").style.display = "block";
    document.getElementById("table-container").style.display = "none";

    fetch("https://services.nvd.nist.gov/rest/json/cves/1.0?cpeMatchString=" + cpeId + resultsPerPageQuery)
        .then((response) => response.json())
        .then((data) => {
            console.log(data);

            if (data.result.CVE_Items) {
                let cveItems = data.result.CVE_Items;
                if (sortingCheckedDate) {
                    cveItems.sort((a, b) => {
                        let aDate = new Date(a.publishedDate);
                        let bDate = new Date(b.publishedDate);
                        return bDate - aDate;
                    });
                }

                if (sortingCheckedRating) {
                    cveItems.sort((a, b) => {
                        let aScore = a.impact.baseMetricV3 ? a.impact.baseMetricV3.cvssV3.baseScore : a.impact.baseMetricV2 ? a.impact.baseMetricV2.cvssV2.baseScore : 0;
                        let bScore = b.impact.baseMetricV3 ? b.impact.baseMetricV3.cvssV3.baseScore : b.impact.baseMetricV2 ? b.impact.baseMetricV2.cvssV2.baseScore : 0;
                        return bScore - aScore;
                    });
                }
                cveItems = cveItems.slice(0, resultsperpage);

                cveItems.forEach((item, index) => {
                    let tr = document.createElement("tr");

                    let description = item.cve.description.description_data.find((desc) => desc.lang === "en");

                    let baseScore = "CVSS score not available";
                    let baseSeverity = "CVSS severity not available";
                    let vectorString = "";

                    if (document.getElementById("cvss-3.1").checked && item.impact.baseMetricV3) {
                        baseScore = item.impact.baseMetricV3.cvssV3.baseScore;
                        baseSeverity = item.impact.baseMetricV3.cvssV3.baseSeverity;
                        vectorString = item.impact.baseMetricV3.cvssV3.vectorString;
                    } else if (document.getElementById("cvss-3.0").checked && item.impact.baseMetricV3) {
                        baseScore = item.impact.baseMetricV3.cvssV3.baseScore;
                        baseSeverity = item.impact.baseMetricV3.cvssV3.baseSeverity;
                        vectorString = item.impact.baseMetricV3.cvssV3.vectorString;
                    } else if (document.getElementById("cvss-2.0").checked && item.impact.baseMetricV2) {
                        baseScore = item.impact.baseMetricV2.cvssV2.baseScore;
                        baseSeverity = item.impact.baseMetricV2.severity;
                        vectorString = "CVSS:2.0/" + item.impact.baseMetricV2.cvssV2.vectorString;
                    }

                    let tableCheckbox = document.getElementById("table-checkbox");

                    if (index === 0) {
                        tr.innerHTML += `<td class="merged-cell">${softwareInput}</td><td><a href="https://nvd.nist.gov/vuln/detail/${item.cve.CVE_data_meta.ID}" target="_blank">${item.cve.CVE_data_meta.ID}</a></td><td></td><td>${baseScore} (${baseSeverity.charAt(0).toUpperCase() + baseSeverity.slice(1).toLowerCase()})${tableCheckbox.checked && vectorString !== "" ? '<br>'+vectorString : ''}</td>`;
                    } else {
                        tr.innerHTML += `<td class="merged-cell"></td><td><a href="https://nvd.nist.gov/vuln/detail/${item.cve.CVE_data_meta.ID}" target="_blank">${item.cve.CVE_data_meta.ID}</a></td><td></td><td>${baseScore} (${baseSeverity.charAt(0).toUpperCase() + baseSeverity.slice(1).toLowerCase()})${tableCheckbox.checked && vectorString !== "" ? '<br>'+vectorString : ''}</td>`;
                    }



                    let cell = tr.cells[2];
                    cell.appendChild(generateDescriptionCell(description.value, index));

                    tbody.appendChild(tr);

                    let undoButton = document.createElement("button");
                    undoButton.textContent = "X";
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



            document.getElementById("loading-animations").style.display = "none";
            document.getElementById("table-container").style.display = "block";
        });

    document.getElementById("cvss-3.1").addEventListener("change", updateCVSSHeader);
    document.getElementById("cvss-3.0").addEventListener("change", updateCVSSHeader);
    document.getElementById("cvss-2.0").addEventListener("change", updateCVSSHeader);

    function updateCVSSHeader() {
        var cvss31Checked = document.getElementById("cvss-3.1").checked;
        var cvss30Checked = document.getElementById("cvss-3.0").checked;
        var cvss20Checked = document.getElementById("cvss-2.0").checked;

        var headerText = 'CVSS Rating';
        if (cvss31Checked && !cvss30Checked && !cvss20Checked) {
            headerText = 'CVSS 3.1 Rating';
        } else if (!cvss31Checked && cvss30Checked && !cvss20Checked) {
            headerText = 'CVSS 3.0 Rating';
        } else if (!cvss31Checked && !cvss30Checked && cvss20Checked) {
            headerText = 'CVSS 2.0 Rating';
        }

        document.querySelector("#cve-table th:last-child").textContent = headerText;
    }

});

function generateDescriptionCell(descriptionValue, rowIndex) {
    // Function to escape special characters for regular expression
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
    }

    // Combine dropdownOptions and aliases
    const optionsAndAliases = dropdownOptions.concat(Object.keys(aliases)).sort((a, b) => b.length - a.length);

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

    // Create a temporary div to convert the descriptionValue to HTML entities
    let tempDiv = document.createElement("div");
    tempDiv.textContent = descriptionValue;
    let htmlEntitiesDescription = tempDiv.innerHTML;

    // Identify phrases or formations from optionsAndAliases that are in the descriptionValue
    const replacements = {};
    let index = 0;
    let highlightedDescription = optionsAndAliases.reduce((acc, option) => {
        const escapedOption = escapeRegExp(option);
        const optionRegex = new RegExp(`(^|\\W)(${escapedOption})(\\W|$)`, "gi");

        return acc.replace(optionRegex, (match, p1, p2, p3, offset, string) => {
            const placeholder = `PLACEHOLDER${index}PLACEHOLDER`;
            replacements[placeholder] = `<span class="highlighted-option" data-option="${option}">${p2}</span>`;
            index++;
            return `${p1}${placeholder}${p3}`;
        });
    }, htmlEntitiesDescription);

    // Replace placeholders with the actual highlighted options
    Object.entries(replacements).forEach(([placeholder, replacement]) => {
        highlightedDescription = highlightedDescription.replace(new RegExp(placeholder, "g"), replacement);
    });

    tooltip.innerHTML = highlightedDescription;

    // Append the tooltip to the container
    tooltipContainer.appendChild(tooltip);

    // Add event listeners to show and hide the tooltip
    tooltipContainer.addEventListener("mouseenter", function() {
        tooltip.style.visibility = "visible";
    });
    tooltipContainer.addEventListener("mouseleave", function() {
        tooltip.style.visibility = "hidden";
    });

    // Add event listener to change cell value when a highlighted option is clicked
    tooltipContainer.addEventListener("click", function(e) {
        if (e.target.classList.contains("highlighted-option")) {
            let selectedOption = e.target.getAttribute("data-option");

            // Check if selected option is not part of the dropdown options and is an alias
            if (!dropdownOptions.includes(selectedOption) && aliases.hasOwnProperty(selectedOption)) {
                selectedOption = aliases[selectedOption];
            }

            select.value = selectedOption;
            select.dispatchEvent(new Event("change"));
        }
    });

    // Return the HTML markup for the tooltip container
    return tooltipContainer;
}



let undoStack = {};