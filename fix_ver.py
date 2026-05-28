import re
with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()
c = re.sub(r"var APP_VERSION = '[^']+'", "var APP_VERSION = 'v8.72'", c)
c = re.sub(r"var APP_BUILD = '[^']+'", "var APP_BUILD = '20260527-15'", c)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('OK')
