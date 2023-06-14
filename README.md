# OSUM - Outdated Software • Updates Missing?

OSUM is a web-based application that assists users in identifying known vulnerabilities in their software applications. It leverages the Common Vulnerabilities and Exposures (CVE) database to provide a comprehensive list of known vulnerabilities for the specified software.

## Features

- Accepts software names and provides relevant Common Platform Enumeration (CPE) values.

- Displays known vulnerabilities in a detailed table, including the CVE ID, vulnerability type, and CVSS Rating.

- Allows users to copy the vulnerability table to the clipboard.

- Provides an option to export the vulnerability table as a .docx file.

- Maintains a search history for each session for easy reference.

## Getting Started

To start using the OSUM tool, clone the repository and install the necessary dependencies using the following commands:

```bash
git clone https://github.com/vycioha/OSUM.git
```

```bash
cd OSUM
```

```bash
pip install -r requirements.txt
```

Then, you can start the application by running the `run.py` script:

```bash
python run.py
```
## How to Use

1. Input the name of the software in the provided field.

2. Click the "Search" button.

3. From the dropdown list of CPEs, select the one that matches your software.

4. Specify the number of CVEs you wish to retrieve.

5. Click the "Generate a table" button to view the list of known vulnerabilities.

6. You can then export the table as a .docx file, copy the table to the clipboard, or save the search history for future reference.

## TODO'S

- Fix export feature

- Add functionality for searching multiple software and generating corresponding results.

- Implement a vulnerability type guesser.

- Display last updated messages.

- Add a footer to the application.

## Latest Updates

- Added CVSS score string setting in table generation.

- Implemented error messages when software is not found.

- Added dark mode for better user experience.

- Improved code organization by splitting main.js and styles.css into separate .js/.css files for easy navigation.

