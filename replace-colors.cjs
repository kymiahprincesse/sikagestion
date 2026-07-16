const fs = require('fs');
const path = require('path');

const mapping = {
  'bg-[#1B2A4A]': 'bg-primary',
  'bg-[#06006E]': 'bg-primary',
  'text-[#1B2A4A]': 'text-textMain',
  'text-[#06006E]': 'text-textMain',
  'border-[#1B2A4A]': 'border-primary',
  'border-[#06006E]': 'border-primary',
  
  'bg-[#E60000]': 'bg-accent',
  'text-[#E60000]': 'text-accent',
  'border-[#E60000]': 'border-accent',
  
  'bg-[#FFE6E6]': 'bg-accentLight',
  
  'bg-[#1F5C99]': 'bg-secondary',
  'text-[#1F5C99]': 'text-secondary',
  
  'bg-[#1A7A4A]': 'bg-success',
  'text-[#1A7A4A]': 'text-success',
  
  'border-[#C8C8D0]': 'border-border',
  'text-[#C8C8D0]': 'text-textMuted',
  'bg-[#C8C8D0]': 'bg-border',
  
  'bg-[#E8ECF4]': 'bg-surfaceMuted',
  'border-[#E8ECF4]': 'border-surfaceMuted',
  
  'bg-[#F8F9FA]': 'bg-backgroundLight',
  
  'bg-white': 'bg-surface',
  'bg-gray-50': 'bg-background',
  'bg-gray-100': 'bg-surfaceMuted',
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const [oldClass, newClass] of Object.entries(mapping)) {
    // Basic regex replace for exact matches inside class attributes or strings
    // We replace ' ' + oldClass + ' ' with ' ' + newClass + ' ', etc.
    const escapedOld = oldClass.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    
    // Replace where the class is bounded by word boundaries or quotes/backticks
    // Since class names have hyphens and brackets, word boundary \b doesn't work well.
    // Use positive lookarounds for whitespace or quotes:
    const regex = new RegExp(`(?<=[\\s"'\\\`])${escapedOld}(?=[\\s"'\\\`])`, 'g');
    
    if (regex.test(content)) {
      content = content.replace(regex, newClass);
      changed = true;
    }
    
    // Also check for start of string if it's the very first class
    const regexStart = new RegExp(`^${escapedOld}(?=[\\s"'\\\`])`, 'g');
    if (regexStart.test(content)) {
      content = content.replace(regexStart, newClass);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated: ' + filePath);
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
