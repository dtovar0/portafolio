import hashlib
import base64
import os
import re

def compute_hash(content):
    h = hashlib.sha256(content.encode('utf-8')).digest()
    return base64.b64encode(h).decode('utf-8')

target_hash = "YTrEuDh8cwArA/Wswxr1QUIdxTsKT2YfHoaP2y0sYq4="

templates_dir = "templates"
for root, dirs, files in os.walk(templates_dir):
    for file in files:
        if file.endswith(".html"):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
                # Find all <script> blocks
                scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
                for s in scripts:
                    # Browsers often compute hash of the exact content inside the tags
                    # but we need to account for Jinja2 placeholders.
                    # We'll just print them for now.
                    h = compute_hash(s)
                    if h == target_hash:
                        print(f"MATCH FOUND in {path}!")
                        print(f"Content: {s}")
                    # Also try stripping whitespace
                    h_strip = compute_hash(s.strip())
                    if h_strip == target_hash:
                        print(f"MATCH FOUND (stripped) in {path}!")
                        print(f"Content: {s}")
