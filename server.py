#!/usr/bin/env python
from flask import Flask, request, send_from_directory, Response
import random, os, base64, json

DATA_PATH = "data/driving/"
from tools.db import conn

# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='')

@app.route('/js/<path:path>')
def send_js(path):
  return send_from_directory('js', path)

@app.route('/css/<path:path>')
def send_css(path):
  return send_from_directory('css', path)

@app.route('/sample')
def sample():
  # CREATE TABLE data (name varchar(200), data text)
  cur = conn.cursor()
  cur.execute("SELECT name, data FROM data OFFSET floor(random() * (SELECT count(*) FROM data)) LIMIT 1")
  name, data = cur.fetchone()
  ret = {"data": data, "name": name}
  return Response(json.dumps(ret))

@app.route('/submit', methods=["POST"])
def submit():
  # CREATE TABLE images (name varchar(200), data text, track text)
  data = request.form['data']
  print request.form['name']
  cur = conn.cursor()
  cur.execute("INSERT into images (name, data, track) VALUES (%s, %s, %s)", (request.form['name'], request.form['data'], request.form['track']))
  conn.commit()
  cur.close()
  return "thanks"

@app.route('/')
def root():
  return send_from_directory('', 'index.html')

if __name__ == "__main__":
  app.run(debug=True)

