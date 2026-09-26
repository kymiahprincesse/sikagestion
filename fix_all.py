import os
import glob

replacements = {
    b'\xc3\x83\xc2\xa9': b'\xc3\xa9',
    b'\xc3\x83\xc2\xa0': b'\xc3\xa0',
    b'\xc3\x83 ': b'\xc3\xa0',
    b'\xc3\x83\xc2\xa8': b'\xc3\xa8',
    b'\xc3\x83\xc2\xa7': b'\xc3\xa7',
    b'\xc3\x83\xc2\xaa': b'\xc3\xaa',
    b'\xc3\x83\xc2\xae': b'\xc3\xae',
    b'\xc3\x83\xc2\xa2': b'\xc3\xa2',
    b'\xc3\x83\xc2\xb4': b'\xc3\xb4',
    b'\xc3\x83\xc2\xbb': b'\xc3\xbb',
    b'\xc3\x83\xc2\x89': b'\xc3\x89',
}

def fix_file(filepath):
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
    except Exception:
        return
    
    changed = False
    for bad, good in replacements.items():
        if bad in content:
            content = content.replace(bad, good)
            changed = True
            
    if changed:
        with open(filepath, 'wb') as f:
            f.write(content)
        print("Fixed:", filepath)

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.scss')):
            fix_file(os.path.join(root, file))

for file in glob.glob('*.*'):
    if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.scss', '.md', '.yml', '.yaml')):
        fix_file(file)

print("Done encoding fixes.")
