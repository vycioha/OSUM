# OSUM - Outdated Software • Updates Missing

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

Then, you can start the API by running the `nvd-api.py` script:

```bash
python nvd-api.py
```
To use the application itself you could host a local server using pyhton 
```bash
cd OSUM
```
```bash
python -m http.server
```
or f.e use 'Live Server' extension by Ritwick Dey in Visual Studio Code

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

- Improve code organization by splitting main.js functions into separate .js files for easy navigation.

## Latest Updates

- Added CVSS score string setting in table generation.

- Implemented error messages when software is not found.

- Added dark mode for better user experience.

