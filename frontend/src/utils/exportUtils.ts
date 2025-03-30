import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface TableRow {
  software: string;
  cveId: string;
  cveUrl: string;
  description: string;
  cvssScore: string;
  vectorString?: string;
}

export const exportAsPNG = async (elementId: string, fileName: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: element.offsetWidth,
      height: element.offsetHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (doc) => {
        const el = doc.getElementById(elementId);
        if (el) {
          try {
            el.style.width = `${element.offsetWidth}px`;
            el.style.height = 'auto';
            
            // Ensure all menus are hidden in clone
            el.querySelectorAll('[role="menu"]').forEach(menu => {
              try {
                (menu as HTMLElement).style.display = 'none';
              } catch (err) {
                console.warn('Could not hide menu', err);
              }
            });
            
            // Hide elements with data-export="hide" attribute
            el.querySelectorAll('[data-export="hide"]').forEach(item => {
              try {
                (item as HTMLElement).style.display = 'none';
              } catch (err) {
                console.warn('Could not hide element with data-export="hide"', err);
              }
            });
            
            // Process software name dropdowns
            el.querySelectorAll('.software-name-dropdown').forEach(dropdown => {
              try {
                // Get the display name from the data-text attribute
                const displayText = dropdown.getAttribute('data-text') || '';
                
                const span = doc.createElement('span');
                span.textContent = displayText;
                span.style.fontWeight = 'normal';
                span.style.color = 'black';
                span.style.padding = '4px';
                
                // Replace the dropdown with plain text
                dropdown.replaceWith(span);
              } catch (err) {
                console.warn('Could not process software name dropdown', err);
              }
            });
            
            // Hide edit icons with various selectors to ensure all are caught
            const hideSelectors = ['.edit-icon', '[class*="edit"]', 'box'];
            hideSelectors.forEach(selector => {
              el.querySelectorAll(selector).forEach(element => {
                try {
                  (element as HTMLElement).style.display = 'none';
                } catch (err) {
                  console.warn(`Could not hide element with selector "${selector}"`, err);
                }
              });
            });
            
            // Handle dropdowns for descriptions only
            el.querySelectorAll('.description-dropdown').forEach(dropdown => {
              try {
                const descriptionText = dropdown.getAttribute('data-text') || dropdown.getAttribute('data-description') || '';
                const span = doc.createElement('span');
                span.textContent = descriptionText;
                
                // Use replaceWith which is safer than parentNode.replaceChild
                dropdown.replaceWith(span);
              } catch (err) {
                console.warn('Could not replace description dropdown', err);
              }
            });
            
            // Remove hover effects from elements
            el.querySelectorAll('[role="group"]').forEach(hoverEl => {
              try {
                (hoverEl as HTMLElement).style.boxShadow = 'none';
                (hoverEl as HTMLElement).style.transform = 'none';
                (hoverEl as HTMLElement).style.backgroundColor = '#FFFFFF';
                
                // Also remove any child elements that might be edit indicators
                hoverEl.querySelectorAll('*').forEach(child => {
                  try {
                    if ((child as HTMLElement).textContent?.includes('✎')) {
                      (child as HTMLElement).style.display = 'none';
                    }
                  } catch (err) {
                    console.warn('Could not process child element of group', err);
                  }
                });
              } catch (err) {
                console.warn('Could not process group element', err);
              }
            });
          } catch (err) {
            console.warn('Error during DOM manipulation before export', err);
          }
        }
      }
    });

    // Create download link
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    throw error;
  }
};

export const exportAsPDF = (data: TableRow[], fileName: string, showVectorString: boolean) => {
  const doc = new jsPDF();
  
  // Set title
  doc.setFontSize(16);
  doc.text('CVE Report', 14, 15);
  doc.setFontSize(10);
  
  // Define columns
  const columns = [
    { header: 'Software', dataKey: 'software' },
    { header: 'CVE ID', dataKey: 'cveId' },
    { header: 'Description', dataKey: 'description' },
    { header: 'CVSS Score', dataKey: 'cvssScore' }
  ];

  // Transform data to include links
  const tableData = data.map(row => ({
    software: row.software,
    cveId: {
      content: row.cveId,
      link: `https://nvd.nist.gov/vuln/detail/${row.cveId}`,
      styles: { textColor: [0, 0, 255] as [number, number, number] }
    },
    description: row.description,
    cvssScore: showVectorString ? `${row.cvssScore}\n${row.vectorString || ''}` : row.cvssScore
  }));

  // Generate table
  autoTable(doc, {
    columns,
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 4,
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      software: { 
        cellWidth: 'auto',
        halign: 'center',
        valign: 'middle'
      },
      cveId: { 
        cellWidth: 'auto',
        halign: 'center',
        valign: 'middle'
      },
      description: { 
        cellWidth: 'auto',
        halign: 'left',
        valign: 'middle'
      },
      cvssScore: { 
        cellWidth: 40,
        font: 'helvetica',
        halign: 'center',
        valign: 'middle'
      }
    },
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    startY: 25,
    theme: 'grid',
    didDrawCell: (data) => {
      // Add hyperlinks to CVE IDs
      if (data.section === 'body' && data.column.dataKey === 'cveId' && typeof data.cell.raw === 'object') {
        const cell = data.cell.raw as { content: string; link: string };
        doc.link(
          data.cell.x, 
          data.cell.y, 
          data.cell.width, 
          data.cell.height, 
          { url: cell.link }
        );
      }
    }
  });

  doc.save(`${fileName}.pdf`);
};

export const exportAsExcel = (data: TableRow[], fileName: string) => {
  // Create worksheet data
  const wsData = data.map(row => ({
    'Software': row.software,
    'CVE ID': row.cveId,
    'Description': row.description,
    'CVSS Score': row.cvssScore,
    ...(row.vectorString ? { 'Vector String': row.vectorString } : {})
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(wsData);

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Software
    { wch: 15 }, // CVE ID
    { wch: 60 }, // Description
    { wch: 15 }, // CVSS Score
    { wch: 40 }  // Vector String (if present)
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Vulnerabilities');

  // Generate Excel file
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const copyToWordTable = async (tableData: any[]) => {
  // Create HTML table structure for Word
  const tableHTML = `
    <table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse">
      <tr>
        <th style="background-color: #f0f0f0">Software</th>
        <th style="background-color: #f0f0f0">CVE ID</th>
        <th style="background-color: #f0f0f0">Description</th>
        <th style="background-color: #f0f0f0">CVSS Score</th>
      </tr>
      ${tableData.map(row => `
        <tr>
          <td>${row.software}</td>
          <td><a href="${row.cveUrl}">${row.cveId}</a></td>
          <td>${row.description}</td>
          <td>${row.cvssScore}${row.vectorString ? '<br>' + row.vectorString : ''}</td>
        </tr>
      `).join('')}
    </table>
  `;

  try {
    // Copy to clipboard as HTML format for Word
    const blob = new Blob([tableHTML], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (err) {
    console.error('Failed to copy to Word format:', err);
    return false;
  }
};
