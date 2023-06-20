document
    .getElementById("software-form")
    .addEventListener("submit", function(e) {
        e.preventDefault();

        let softwareInput = document.getElementById("software-input").value;

        document.getElementById("loading-animations").style.display = "block";

        // Call your backend with the software name, update the CPE dropdown when data returns
        fetch("http://localhost:5000/api/v1/cpe_search?keyword=" + softwareInput)
            .then((response) => response.json())
            .then((data) => {
                let select = document.getElementById("cpe-select");
                // Remove old options
                select.innerHTML = "";

                // Check if data is empty
                if (data.length === 0) {
                    let errorMessage = document.getElementById("error-message");
                    errorMessage.textContent = "Oops! No matching CPEs were found.";
                    errorMessage.style.display = "block";
                    errorMessage.style.fontSize = "2em";
                    errorMessage.style.fontWeight = "bold";
                    errorMessage.style.color = "#FF6347";
                    errorMessage.style.textAlign = "center";
                    errorMessage.style.paddingTop = "20px";
                    errorMessage.style.transition = "all 2s";

                    // Hide other elements
                    document.getElementById("cpe-picker").style.display = "none";
                    document.getElementById("table-container").style.display = "none";
                } else {
                    // Add new options
                    data.forEach((cpe) => {
                        console.log(cpe);
                        let option = document.createElement("option");
                        option.text = cpe.cpeName;
                        option.value = cpe.cpeName; // Assuming you want to use the CPE name as the value
                        select.add(option);
                    });
                    // Hide the error message if previously shown
                    let errorMessage = document.getElementById("error-message");
                    errorMessage.style.display = "none";
                    document.getElementById("cpe-picker").style.display = "block";
                }

                // Hide the loading message after data is loaded
                document.getElementById("loading-animations").style.display = "none";
            })
            .catch((error) => {
                // Handle any errors during the fetch operation
                console.error("Error:", error);
            });
    });