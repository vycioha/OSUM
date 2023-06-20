# OSUM - Outdated Software • Updates Missing?

OSUM is a web-based application that assists users in identifying known software vulnerabilities. It leverages the Common Vulnerabilities and Exposures (CVE) database to provide a comprehensive list of known vulnerabilities for specified software.

![](/static/assets/OSUM.PNG)

## Features

- Accepts software names and provides relevant Common Platform Enumeration (CPE) values using the `nvdlib` library.
- Sends requests to the services.nvd.nist.gov API for up-to-date data about CVEs and CPEs.
- Displays known vulnerabilities in a table, including the CVE ID, vulnerability type, and CVSS Rating.
- Allows vulnerabilities to be sorted by risk rating or release date.
- Provides vulnerability type suggestions directly from their descriptions (`dropdownOptions.js` can be updated to add more options and aliases).
- Maintains a searchable history for easy reference (uses LocalStorage).

## Getting Started

To start using the OSUM tool, clone the repository and install the necessary dependencies using the following commands:

```shell
git clone https://github.com/vycioha/OSUM.git
```
```shell
cd OSUM
```
```shell
pip install -r requirements.txt
```
Then, you can start the application by running the `run.py` script:
```python3
>python run.py
  ___   ____   _   _  __  __  ___ 
 / _ \ / ___| | | | ||  \/  ||__ \
| | | |\___ \ | | | || |\/| |  / /
| |_| | ___) || |_| || |  | | |_|
 \___/ |____/  \___/ |_|  |_| (_)

 * Serving Flask app 'run'
 * Debug mode: off
 * Running on http://127.0.0.1:5000
 INFO: Press CTRL+C to quit
```
## How to Use   
    
- Open your browser and navigate to `127.0.0.1:5000` (works best on Firefox and Chrome).
- Input the name of the software into the provided field.
- Click the "Search" button.
- From the dropdown list of CPEs, select the one that matches your software.
- Specify the number of CVEs you wish to retrieve.
- Click the "Generate a table" button to view the list of known vulnerabilities.
- Explore the other options as you need.


