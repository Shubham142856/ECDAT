import urllib.request
import re

with urllib.request.urlopen('http://localhost:3000/dashboard/assets') as r:
    html = r.read().decode('utf-8')
    scripts = re.findall(r'src="(/_next/static/[^"]+\.js)"', html)
    print(f'Found {len(scripts)} scripts in /dashboard/assets HTML')
    for s in scripts:
        with urllib.request.urlopen(f'http://localhost:3000{s}') as sr:
            assert sr.status == 200
            print(f'  Script {s} -> 200 OK ({len(sr.read())} bytes)')

print('\nALL SCRIPTS LOADED CLEANLY WITH 200 OK!')
