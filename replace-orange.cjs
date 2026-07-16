const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.match(/\.(jsx|js|tsx|ts)$/)) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace exact orange tailwind color names
  content = content.replace(/bg-orange/g, 'bg-rouge');
  content = content.replace(/text-orange/g, 'text-rouge');
  content = content.replace(/border-orange/g, 'border-rouge');
  content = content.replace(/ring-orange/g, 'ring-rouge');
  
  // Replace orangeClair
  content = content.replace(/orangeClair/g, 'rougeClair');

  if (content !== original) {
    fs.writeFileSync(file, content);
    changedCount++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Total files updated: ${changedCount}`);
