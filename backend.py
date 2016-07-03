#!/usr/bin/env python
from flask import Flask, request, send_from_directory, Response
import random, os, base64, json
import sys

from db import conn
import base64

app = Flask(__name__, static_url_path='')

# to config?
DATA_PATH = "data/driving/"

@app.route('/')
def root():
  ret = ["<html><body><table>"]
  cur = conn.cursor()
  cur.execute("SELECT * FROM images LIMIT 50")
  for name, data, track in cur.fetchall():
    img = base64.b64encode(open(os.path.join(DATA_PATH, name)).read())
    print name
    ret.append('<tr><td><img src="data:image/png;base64,'+img+'" /></td><td><img src="'+data+'" /></td></tr>')
  return ''.join(ret)

if __name__ == "__main__":
  lst = []
  if len(sys.argv) > 1:
    cur = conn.cursor()
    cur.execute("SELECT * FROM images")
    i = 0
    for name, data, track in cur.fetchall():
      print "downloading", name
      lst.append({"name": name, "data": data, "track": track})
      i += 1
    print "got", i
    st = json.dumps(lst)
    open("/staging/dump.json", "w").write(st)
  else:
    #app.run(debug=True, host="0.0.0.0")
    app.run(debug=True)

