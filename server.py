#!/usr/bin/env python
from flask import Flask, request, send_from_directory, Response
import random, os, base64, json

# connect to the database
import psycopg2
import urlparse

urlparse.uses_netloc.append("postgres")
url = urlparse.urlparse(os.environ["DATABASE_URL"])

conn = psycopg2.connect(
    database=url.path[1:],
    user=url.username,
    password=url.password,
    host=url.hostname,
    port=url.port
)

# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='')

@app.route('/js/<path:path>')
def send_js(path):
  return send_from_directory('js', path)

@app.route('/css/<path:path>')
def send_css(path):
  return send_from_directory('css', path)

"""
@app.route('/data/<path:path>')
def send_data(path):
  return send_from_directory('data', path)
"""

DATA_PATH = "data/driving/"

@app.route('/sample')
def sample():
  f = random.choice(os.listdir(DATA_PATH))
  dat = "data:image/png;base64,"+base64.b64encode(open(os.path.join(DATA_PATH, f)).read())
  ret = {"data": dat, "name": f}
  return Response(json.dumps(ret))

@app.route('/submit', methods=["POST"])
def submit():
  print request.form
  # TODO: push request.form into mongodb
  return "thanks"

@app.route('/')
def root():
  return send_from_directory('', 'index.html')

if __name__ == "__main__":
  app.run(debug=True)

