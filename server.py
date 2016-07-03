#!/usr/bin/env python
from flask import Flask, request, send_from_directory

# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='')

@app.route('/js/<path:path>')
def send_js(path):
  return send_from_directory('js', path)

@app.route('/css/<path:path>')
def send_css(path):
  return send_from_directory('css', path)

@app.route('/data/<path:path>')
def send_data(path):
  return send_from_directory('data', path)

@app.route('/')
def root():
  return send_from_directory('', 'index.html')

if __name__ == "__main__":
  app.run(debug=True)

