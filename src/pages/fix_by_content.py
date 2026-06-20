import os
import re

path = r"d:\desktop\backend\front-end\src\pages\AdminSettings.tsx"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "panelsLoading ?" in line and "panels.length" in line:
        # line 708
        lines[i] = re.sub(r'\{panelsLoading \? ".*" \: panels\.length\}', '{panelsLoading ? "—" : panels.length}', line)
    elif "panelsLoading ?" in line and "panels provisioned" in line:
        # line 712
        lines[i] = re.sub(r'\{panelsLoading \? ".*" \: `panels provisioned`\}', '{panelsLoading ? "● Loading…" : `panels provisioned`}', line)
    elif '<option value="">' in line and 'Select a company' in line:
        # lines 1931, 2084
        lines[i] = '                            <option value="">— Select a company —</option>\n'
    elif '<option value="">' in line and 'Select a branch' in line:
        # lines 1955, 2108
        lines[i] = '                            <option value="">— Select a branch —</option>\n'

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Fixed lines successfully.")
