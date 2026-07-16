const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.jsx', 'utf8');

// Replace all onClick={() => setSidebarOpen(false)} with conditional hide for mobile
content = content.replace(
  /onClick=\{\(\) => setSidebarOpen\(false\)\}/g,
  `onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}`
);

fs.writeFileSync('src/components/Layout.jsx', content);
console.log('Fixed sidebar click handlers');
