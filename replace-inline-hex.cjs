const fs = require('fs');
const path = require('path');

const hexToVar = {
  '#1B2A4A': 'var(--color-primary)',
  '#06006E': 'var(--color-primary)',
  '#E60000': 'var(--color-accent)',
  '#FFE6E6': 'var(--color-accent-light)',
  '#1F5C99': 'var(--color-secondary)',
  '#1A7A4A': 'var(--color-success)',
  '#C8C8D0': 'var(--color-border)',
  '#E8ECF4': 'var(--color-surface-muted)',
  '#F8F9FA': 'var(--color-bg-light)',
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const [hex, cssVar] of Object.entries(hexToVar)) {
    // Replace case-insensitive hex strings
    const regex = new RegExp(hex, 'gi');
    if (regex.test(content)) {
      content = content.replace(regex, cssVar);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated hex: ' + filePath);
  }
}

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.jsx')) {
      replaceInFile(full);
    }
  }
}

walk('src');
