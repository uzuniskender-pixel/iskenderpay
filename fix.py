with open("sw.js", "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace("ip-static-v7", "ip-static-v8")
with open("sw.js", "w", encoding="utf-8") as f:
    f.write(c)
print("OK")
