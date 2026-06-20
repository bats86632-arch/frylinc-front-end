import os

path = r"d:\desktop\backend\front-end\src\pages\AdminSettings.tsx"

with open(path, "rb") as f:
    data = f.read()

# We know the file might have BOM or be Windows-1252. 
# Let's decode it safely. If it's utf-8 with literal "â€”", decode utf-8.
if data.startswith(b'\xef\xbb\xbf'):
    data = data[3:]

try:
    text = data.decode('utf-8')
except UnicodeDecodeError:
    text = data.decode('windows-1252')

# Replace the mangled substrings
text = text.replace('â€”', '—')
text = text.replace('Loadingâ€¦', '● Loading…')
text = text.replace('??', '—')
text = text.replace('Loading?', '● Loading…')

# Write back as clean UTF-8
with open(path, "wb") as f:
    f.write(text.encode('utf-8'))

print("File fixed and saved as UTF-8.")
