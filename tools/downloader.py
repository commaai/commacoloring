#!/usr/bin/env python
import os
from db import conn
import json
import sys

OUTFILE = os.getenv("OUTFILE", "/staging/dump.json")

if __name__ == "__main__":
  if len(sys.argv) > 1:
    OUTFILE = sys.argv[1]
  lst = []
  cur = conn.cursor()

  i = 0

  """
  cur.execute("SELECT * FROM images")
  for name, data, track in cur.fetchall():
    print "downloading", name
    lst.append({"name": name, "data": data, "track": track})
    i += 1
  """

  # support images2 download
  cur.execute("SELECT * FROM images2")
  for name, data, track, email, gid in cur.fetchall():
    print "downloading", name, email
    lst.append({"name": name, "data": data, "track": track, "email": email, "gid": gid})
    i += 1

  print "got", i
  st = json.dumps(lst)
  open(OUTFILE, "w").write(st)

