from flask import Flask, jsonify, request
import nvdlib
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Apply CORS to your app


@app.route('/api/v1/cpe_search', methods=['GET'])
def cpe_search():
    keyword = request.args.get(
        'keyword', type=str)
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
    app.run(debug=True)


# https://nvdlib.com/en/latest/
