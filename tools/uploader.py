#!/usr/bin/env python
from db import conn
import os, sys, json, base64

TABLE = os.getenv("TABLE", 'data')
assert TABLE == "data" or TABLE == "suggestions"

if __name__ == "__main__":
  for f in sys.argv[1:]:
    bn = os.path.basename(f)
    print "uploading", f, "as", bn
    dat = "data:image/png;base64,"+base64.b64encode(open(f).read())

    cur = conn.cursor()
    cur.execute("INSERT into "+TABLE+" (name, data) VALUES (%s, %s)", (bn, dat))
    conn.commit()
    cur.close()


