from flask import Flask, jsonify, request, render_template, send_from_directory
import nvdlib
from flask_cors import CORS
from termcolor import colored
import logging
import colorama
from art import text2art
# import webbrowser
# from threading import Timer


colorama.init()

app = Flask(__name__)
CORS(app)

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

    FILE_COLORS = {
        '/api/': 'green',
        '/static/': 'blue',
    }

    def emit(self, record):
        # Set the color based on the log level
        color = self.COLORS.get(record.levelname, 'white')

        # Get the request path
        path = request.path if request else ''

        # Check if the path matches any known file patterns
        for file_path in self.FILE_COLORS:
            if file_path in path:
                color = self.FILE_COLORS[file_path]
                break

        # Colorize the message
        record.msg = f"{colored(record.levelname, color)}: {colored(record.msg, color)}"

        super().emit(record)

# Get the Flask logger
werkzeug_logger = logging.getLogger('werkzeug')

# Remove all handlers
for handler in werkzeug_logger.handlers[:]:
    werkzeug_logger.removeHandler(handler)

# Create a new handler and add it
werkzeug_handler = ColoredHandler()
werkzeug_logger.addHandler(werkzeug_handler)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/js/<path:filename>')
def serve_js(filename):
    if request.method == 'GET' and request.headers.get('If-None-Match'):
        return '', 304
    return send_from_directory('static/js', filename, mimetype='application/javascript')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

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

# def open_browser():
#       webbrowser.open_new('http://127.0.0.1:5000/')

if __name__ == '__main__':
    # Timer(1, open_browser).start()
    app.run(debug=False, host='127.0.0.1', port=5000, threaded=True)

