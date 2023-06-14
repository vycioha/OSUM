import { asBlob } from './html-docx.js';

document.getElementById("export-button").addEventListener("click", function() {
    let tableData = document.getElementById("cve-table").outerHTML;

    // Convert HTML to DOCX
    let docx = asBlob(tableData, { orientation: 'portrait' });

    // Save the DOCX file
    saveAs(docx, "table.docx");
});