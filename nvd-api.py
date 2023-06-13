from flask import Flask, jsonify, request
import nvdlib
from flask_cors import CORS
from termcolor import colored
import logging
import colorama
from art import text2art
from datetime import datetime

colorama.init()

app = Flask(__name__)
CORS(app)  # Apply CORS to your app

OSUM = text2art("OSUM?")
OSUM = colored(OSUM, "green")
print(OSUM)

class ColoredHandler(logging.StreamHandler):
    COLORS = {
        'DEBUG': 'blue',
        'INFO': 'green',
        'WARNING': 'yellow',
        'ERROR': 'red',
        'CRITICAL': 'red',
    }

    def emit(self, record):
        # Set the color based on the log level
        color = self.COLORS.get(record.levelname, 'white')

        # Add a timestamp
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Colorize the message and add the timestamp
        record.msg = f"{colored(timestamp, 'cyan')} {colored(record.levelname, color)}: {colored(record.msg, color)}"

        super().emit(record)

# Get the Flask logger
logger = logging.getLogger('werkzeug')

# Remove all handlers
for handler in logger.handlers[:]:
    logger.removeHandler(handler)

# Create a new handler and add it
handler = ColoredHandler()
logger.addHandler(handler)


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
