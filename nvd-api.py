from flask import Flask, jsonify, request
import nvdlib
from flask_cors import CORS
from termcolor import colored
import colorama
colorama.init()
from art import text2art

app = Flask(__name__)
CORS(app)  # Apply CORS to your app

OSUM = text2art("OSUM?")
OSUM = colored(OSUM, "green")
print(OSUM)

@app.route('/api/v1/cpe_search', methods=['GET'])
def cpe_search():
    keyword = request.args.get('keyword', type=str)
    limit = request.args.get('limit', type=int)

    r = nvdlib.searchCPE(keywordSearch=keyword, limit=limit)

    results = []

    for eachCPE in r:
        cpe_data = {
            'cpeName': eachCPE.cpeName,
        }
        results.append(cpe_data)

    return jsonify(results)


if __name__ == '__main__':
    app.run(debug=False, host='127.0.0.1', port=5000, threaded=True)
