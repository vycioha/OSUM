from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import logging
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

@app.route('/api/v1/cpe_search', methods=['GET'])
def cpe_search():
    keyword = request.args.get('keyword', type=str)
    limit = request.args.get('limit', type=int, default=100)
    api_key = request.headers.get('apiKey')

    logging.info(f'CPE Search request for keyword: {keyword}')

    if not keyword:
        logging.warning('No search term provided')
        return jsonify({'error': 'No search term provided'}), 400

    try:
        headers = {}
        if api_key:
            headers['apiKey'] = api_key
            logging.info('Using API key for authentication')

        url = f"https://services.nvd.nist.gov/rest/json/cpes/2.0?keywordSearch={keyword}&resultsPerPage={limit}"
        logging.info(f'Requesting: {url}')
        
        response = requests.get(url, headers=headers)
        
        if not response.ok:
            logging.error(f'NVD API error: {response.status_code}')
            return jsonify({'error': 'Failed to fetch from NVD'}), response.status_code

        data = response.json()
        results = []
        
        for product in data.get('products', []):
            cpe = product.get('cpe', {})
            cpe_data = {
                'cpeName': cpe.get('cpeName'),
                'title': product.get('titles', [{}])[0].get('title', cpe.get('cpeName', '').split(':')[4])
            }
            results.append(cpe_data)
        
        logging.info(f'Found {len(results)} results')
        return jsonify(results)
    except Exception as e:
        logging.error(f'Error processing request: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/get_cves', methods=['GET'])
def get_cves():
    cpe_name = request.args.get('cpeName', type=str)
    api_key = request.headers.get('apiKey')
    preferred_version = request.args.get('preferredVersion', type=str, default='3.1')
    sort_by = request.args.get('sortBy', type=str, default='severe')
    limit = request.args.get('limit', type=int)
    
    logging.info(f'Get CVEs request for CPE: {cpe_name}')
    
    if not cpe_name:
        logging.warning('No CPE name provided')
        return jsonify({'error': 'No CPE name provided'}), 400

    # Check if the input looks like a CVE ID instead of a CPE
    if cpe_name.startswith('CVE-'):
        logging.warning(f'Received CVE ID ({cpe_name}) in CPE endpoint')
        return jsonify({
            'error': 'Invalid CPE format. Use /api/v1/get_cve_by_id endpoint for CVE IDs'
        }), 400

    try:
        headers = {}
        if api_key:
            headers['apiKey'] = api_key
            logging.info('Using API key for authentication')

        url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName={cpe_name}"
        logging.info(f'Requesting: {url}')
        
        response = requests.get(url, headers=headers)
        
        if not response.ok:
            logging.error(f'NVD API error: {response.status_code} - {response.text}')
            return jsonify({'error': f'NVD API error: {response.status_code}'}), response.status_code

        data = response.json()
        logging.info(f'Successfully retrieved data from NVD API')
        
        cves = []
        seen_cve_ids = set()
        
        for vuln in data.get('vulnerabilities', []):
            cve = vuln.get('cve', {})
            cve_id = cve.get('id')
            
            if cve_id in seen_cve_ids:
                continue
                
            seen_cve_ids.add(cve_id)
            metrics = cve.get('metrics', {})
            
            # Create version-metric mapping with priorities
            version_metrics = {
                '4.0': metrics.get('cvssMetricV40', [{}])[0].get('cvssData'),
                '3.1': metrics.get('cvssMetricV31', [{}])[0].get('cvssData'),
                '3.0': metrics.get('cvssMetricV30', [{}])[0].get('cvssData'),
                '2.0': metrics.get('cvssMetricV2', [{}])[0].get('cvssData')
            }

            # First try preferred version
            cvss_data = version_metrics.get(preferred_version)
            cvss_version = preferred_version

            # If preferred version not available, try others in order
            if not cvss_data:
                for ver in ['4.0', '3.1', '3.0', '2.0']:
                    if version_metrics.get(ver):
                        cvss_data = version_metrics[ver]
                        cvss_version = ver
                        break

            if not cvss_data:
                continue

            vector_string = cvss_data.get('vectorString')
            # Add CVSS:2.0/ prefix if missing for v2.0 vectors
            if cvss_version == '2.0' and vector_string and not vector_string.startswith('CVSS:'):
                vector_string = f'CVSS:2.0/{vector_string}'

            # Get published date for sorting
            published_date = cve.get('published', '')

            cves.append({
                'software': cpe_name,
                'cveId': cve.get('id'),
                'description': cve.get('descriptions', [{}])[0].get('value', ''),
                'cvssScore': cvss_data.get('baseScore'),
                'cvssVersion': cvss_version,
                'vectorString': vector_string,
                'publishedDate': published_date
            })

        # Sort the results based on the sortBy parameter
        if sort_by == 'recent':
            cves.sort(key=lambda x: x['publishedDate'], reverse=True)
        else:  # sort by severity
            cves.sort(key=lambda x: float(x['cvssScore'] or 0), reverse=True)

        # Apply limit if specified
        if limit and limit > 0:
            cves = cves[:limit]

        return jsonify(cves)
    except requests.RequestException as e:
        logging.error(f'Request error: {str(e)}')
        return jsonify({'error': f'Failed to fetch data: {str(e)}'}), 500
    except ValueError as e:
        logging.error(f'JSON parsing error: {str(e)}')
        return jsonify({'error': 'Invalid response from NVD'}), 500
    except Exception as e:
        logging.error(f'Unexpected error: {str(e)}', exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v1/get_cve_by_id', methods=['GET'])
def get_cve_by_id():
    cve_id = request.args.get('cveId', type=str)
    api_key = request.headers.get('apiKey')
    preferred_version = request.args.get('preferredVersion', type=str, default='3.1')
    
    logging.info(f'Get CVE by ID request for: {cve_id}')
    
    if not cve_id:
        logging.warning('No CVE ID provided')
        return jsonify({'error': 'No CVE ID provided'}), 400

    try:
        headers = {}
        if api_key:
            headers['apiKey'] = api_key
            logging.info('Using API key for authentication')

        url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}"
        logging.info(f'Requesting: {url}')
        
        response = requests.get(url, headers=headers)
        
        if not response.ok:
            logging.error(f'NVD API error: {response.status_code} - {response.text}')
            return jsonify({'error': f'NVD API error: {response.status_code}'}), response.status_code

        data = response.json()
        
        if not data.get('vulnerabilities'):
            logging.warning(f'CVE not found: {cve_id}')
            return jsonify({'error': 'CVE not found'}), 404

        vuln = data['vulnerabilities'][0]['cve']
        metrics = vuln.get('metrics', {})
        
        # Create version-metric mapping with priorities
        version_metrics = {
            '4.0': metrics.get('cvssMetricV40', [{}])[0].get('cvssData'),
            '3.1': metrics.get('cvssMetricV31', [{}])[0].get('cvssData'),
            '3.0': metrics.get('cvssMetricV30', [{}])[0].get('cvssData'),
            '2.0': metrics.get('cvssMetricV2', [{}])[0].get('cvssData')
        }

        # First try preferred version
        cvss_data = version_metrics.get(preferred_version)
        cvss_version = preferred_version

        # If preferred version not available, try others in order
        if not cvss_data:
            for ver in ['4.0', '3.1', '3.0', '2.0']:
                if version_metrics.get(ver):
                    cvss_data = version_metrics[ver]
                    cvss_version = ver
                    break

        if not cvss_data:
            logging.warning(f'No CVSS data available for {cve_id}')
            published_date = vuln.get('published', '')
            parsed_date = int(datetime.strptime(published_date, "%Y-%m-%dT%H:%M:%S.%f").timestamp()) if published_date else None
            
            # Return basic info with missingCvssData flag instead of 404
            result = [{
                'software': f'Custom CVE: {cve_id}',
                'cveId': vuln['id'],
                'description': vuln.get('descriptions', [{}])[0].get('value', ''),
                'cvssScore': 0,
                'cvssVersion': 'N/A',
                'vectorString': 'N/A',
                'publishedDate': published_date,
                'parsedDate': parsed_date,
                'missingCvssData': True
            }]
            logging.info(f'Successfully retrieved basic CVE data for {cve_id} (no CVSS data)')
            return jsonify(result)

        vector_string = cvss_data.get('vectorString')
        # Add CVSS:2.0/ prefix if missing for v2.0 vectors
        if cvss_version == '2.0' and vector_string and not vector_string.startswith('CVSS:'):
            vector_string = f'CVSS:2.0/{vector_string}'
        
        published_date = vuln.get('published', '')
        parsed_date = int(datetime.strptime(published_date, "%Y-%m-%dT%H:%M:%S.%f").timestamp()) if published_date else None
        
        # Return a single-element array to match the format expected by the frontend
        result = [{
            'software': f'Custom CVE: {cve_id}',
            'cveId': vuln['id'],
            'description': vuln.get('descriptions', [{}])[0].get('value', ''),
            'cvssScore': cvss_data.get('baseScore'),
            'cvssVersion': cvss_version,
            'vectorString': vector_string,
            'publishedDate': published_date,
            'parsedDate': parsed_date,
            'missingCvssData': False
        }]

        logging.info(f'Successfully retrieved CVE data for {cve_id}')
        return jsonify(result)

    except requests.RequestException as e:
        logging.error(f'Request error: {str(e)}')
        return jsonify({'error': f'Failed to fetch data: {str(e)}'}), 500
    except ValueError as e:
        logging.error(f'JSON parsing error: {str(e)}')
        return jsonify({'error': 'Invalid response from NVD'}), 500
    except Exception as e:
        logging.error(f'Unexpected error: {str(e)}', exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v1/check_cve_exists', methods=['GET'])
def check_cve_exists():
    cve_id = request.args.get('cveId', type=str)
    api_key = request.headers.get('apiKey')
    
    logging.info(f'Checking if CVE exists: {cve_id}')
    
    if not cve_id:
        logging.warning('No CVE ID provided')
        return jsonify({'error': 'No CVE ID provided'}), 400

    try:
        headers = {}
        if api_key:
            headers['apiKey'] = api_key
            logging.info('Using API key for authentication')

        url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}"
        logging.info(f'Requesting: {url}')
        
        response = requests.get(url, headers=headers)
        
        if not response.ok:
            logging.error(f'NVD API error: {response.status_code} - {response.text}')
            return jsonify({'error': f'NVD API error: {response.status_code}'}), response.status_code

        data = response.json()
        
        if not data.get('vulnerabilities'):
            logging.warning(f'CVE not found: {cve_id}')
            return jsonify({'error': 'CVE not found'}), 404

        vuln = data['vulnerabilities'][0]['cve']
        
        # Return basic CVE info without CVSS data
        result = {
            'exists': True,
            'cveId': vuln['id'],
            'description': vuln.get('descriptions', [{}])[0].get('value', ''),
            'published': vuln.get('published', '')
        }

        logging.info(f'CVE {cve_id} exists in NVD database')
        return jsonify(result)

    except requests.RequestException as e:
        logging.error(f'Request error: {str(e)}')
        return jsonify({'error': f'Failed to fetch data: {str(e)}'}), 500
    except ValueError as e:
        logging.error(f'JSON parsing error: {str(e)}')
        return jsonify({'error': 'Invalid response from NVD'}), 500
    except Exception as e:
        logging.error(f'Unexpected error: {str(e)}', exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    logging.info('Starting Flask server...')
    app.run(debug=True)
