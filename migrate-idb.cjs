const fs = require('fs');
const path = require('path');

const storeDir = path.join(__dirname, 'src', 'store');
const files = fs.readdirSync(storeDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(storeDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('persist') && !content.includes('idbStorage')) {
    // 1. Update zustand/middleware import
    if (content.includes("import { persist } from 'zustand/middleware';")) {
      content = content.replace("import { persist } from 'zustand/middleware';", "import { persist, createJSONStorage } from 'zustand/middleware';");
    } else if (content.includes("persist") && !content.includes("createJSONStorage")) {
      content = content.replace(/import\s+{([^}]*persist[^}]*)}\s+from\s+['"]zustand\/middleware['"];/, "import { $1, createJSONStorage } from 'zustand/middleware';");
    }

    // 2. Add idbStorage import
    const importRegex = /^import\s+.*$/gm;
    const imports = content.match(importRegex) || [];
    const lastImport = imports[imports.length - 1];
    if (lastImport) {
      content = content.replace(lastImport, lastImport + "\nimport { idbStorage } from '../lib/idbStorage';");
    }

    // 3. Add storage config
    content = content.replace(/name:\s*['"]([^'"]+)['"]/g, "name: '$1',\n      storage: createJSONStorage(() => idbStorage)");
    
    // 4. Remove partialize trick
    content = content.replace(/,\s*partialize:\s*\(\)\s*=>\s*\(\{\}\)/g, "");

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
