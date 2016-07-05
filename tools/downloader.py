#!/usr/bin/env python
from db import conn
import json

if __name__ == "__main__":
  lst = []
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

