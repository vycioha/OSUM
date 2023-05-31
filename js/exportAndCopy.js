// Event listener for the remember button


document.getElementById("export-button").addEventListener("click", function() {
    let tableData = document.getElementById("cve-table").outerHTML;
    let blob = new Blob([tableData], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    saveAs(blob, "table.docx");
});