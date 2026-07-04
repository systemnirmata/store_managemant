import os, re
imports = set()
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ['__pycache__', '.venv', 'venv']]
    for f in files:
        if f.endswith('.py'):
            try:
                content = open(os.path.join(root, f), encoding='utf-8', errors='ignore').read()
                for m in re.findall(r'^(?:import|from)\s+(\w+)', content, re.MULTILINE):
                    imports.add(m)
            except:
                pass
print(sorted(imports))