# Outdated Software - Updates Missing (OSUM)

OSUM is a web-based tool that helps users to check if their software applications have any known vulnerabilities. It uses the CVE (Common Vulnerabilities and Exposures) database to provide a list of known vulnerabilities for the given software.

## Features

- Accepts software names.
- Provides a dropdown list of suitable CPE (Common Platform Enumeration) values for the selected software.
- Displays the known vulnerabilities in a table with details like CVE ID, Vulnerability type, and CVSS Rating.
- Functionality to copy the vulnerability table to the clipboard.
- Option to export the vulnerability table as a .docx file.
- Saves the search history for each session.

## Usage 

To use this tool, follow these steps:

1. Enter the software name(s) in the input field.
2. Click the "Search" button.
3. From the dropdown list of CPEs, select the suitable CPE for your software.
4. Select the number of CVEs you want to retrieve.
5. Click the "Generate a table" button to see the list of known vulnerabilities.
6. You can export the table as a .docx file, copy the table to the clipboard, or save the search history for future reference.



TODO

add multiple software seach Functionality and generation
add vulnerability type guesser
add last updated messages
add footer
fix history button
split main.js functions to other .js files for easy navigation

DONE

added cvss score string setting in table generation
added error messages when software is not found
adde dark mode