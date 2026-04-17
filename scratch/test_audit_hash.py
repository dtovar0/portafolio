import hashlib
import base64

def compute_hash(content):
    h = hashlib.sha256(content.encode('utf-8')).digest()
    return base64.b64encode(h).decode('utf-8')

target_hash = "YTrEuDh8cwArA/Wswxr1QUIdxTsKT2YfHoaP2y0sYq4="

# Try candidate from audit.html
# Note: Indentation in audit.html:
# 146: <script nonce="{{ csp_nonce() }}">
# 147:     window.__datos = {
# 148:         urls: {
# 149:             home: "{{ url_for('index') }}"
# 150:         }
# 151:     };
# 152: </script>

# In browser, it might be:
c1 = """
    window.__datos = {
        urls: {
            home: "/"
        }
    };
"""
# Note: the newlines at start and end might be there.

candidates = [
    # No starting/ending newlines
    '    window.__datos = {\n        urls: {\n            home: "/"\n        }\n    };',
    # With starting/ending newlines
    '\n    window.__datos = {\n        urls: {\n            home: "/"\n        }\n    };\n',
    # Indentation might be different?
    'window.__datos = {\n    urls: {\n        home: "/"\n    }\n};',
]

for c in candidates:
    print(f"Hash of [{c.replace('\\n', ' ')}]: {compute_hash(c)}")
    if compute_hash(c) == target_hash:
        print("MATCH!")

# Let's try to match exactly
# Maybe it's empty?
print(f"Hash of empty: {compute_hash('')}")
