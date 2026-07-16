const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.jsx', 'utf8');

// 1. Update <aside> classes
content = content.replace(
  /className=\{`fixed top-0 left-0 z-30 flex flex-col h-screen transition-transform duration-300 glass-sidebar \$\{\n\s*sidebarOpen \? 'translate-x-0' : '-translate-x-full'\n\s*\}\`\}\n\s*style=\{\{ width: '280px', maxWidth: '85vw' \}\}/g,
  `className={\`fixed top-0 left-0 z-30 flex flex-col h-screen transition-all duration-300 glass-sidebar \${
          sidebarOpen ? 'w-[280px] translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-[80px]'
        }\`}
        style={{ maxWidth: '85vw' }}`
);

// 2. Update <main> classes
content = content.replace(
  /<main className=\{`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 \$\{sidebarOpen \? 'lg:ml-\[280px\]' : 'ml-0'\}\`\}>/g,
  `<main className={\`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 \${sidebarOpen ? 'lg:ml-[280px]' : 'ml-0 lg:ml-[80px]'}\`}>`
);

// 3. Update the user info box in sidebar
content = content.replace(
  /<div className="px-4 pb-3">\n\s*<div className="px-4 py-3 rounded-lg border border-white\/10 bg-white\/5 backdrop-blur-md transition-all duration-300 hover:bg-white\/10">\n\s*<p className="text-white font-semibold text-sm truncate">\{utilisateurConnecte\.nom\}<\/p>\n\s*<p className="text-xs mt-0\.5" style=\{\{ color: '#8BA3C7' \}\}>\{utilisateurConnecte\.role\}<\/p>\n\s*<\/div>\n\s*<\/div>/g,
  `<div className="px-4 pb-3">
              <div className={\`rounded-lg border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 hover:bg-white/10 flex flex-col items-center justify-center \${sidebarOpen ? 'px-4 py-3' : 'py-3'}\`}>
                {sidebarOpen ? (
                  <>
                    <p className="text-white font-semibold text-sm truncate w-full text-center">{utilisateurConnecte.nom}</p>
                    <p className="text-xs mt-0.5 text-center" style={{ color: '#8BA3C7' }}>{utilisateurConnecte.role}</p>
                  </>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                    {utilisateurConnecte.nom.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>`
);

// 4. Update the text spans in the links.
content = content.replace(
  /<span className="text-sm font-semibold tracking-wide">/g,
  `<span className={\`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 \${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}\`}>`
);

// 5. Deconnexion button text
content = content.replace(
  /<span>Déconnexion<\/span>/g,
  `<span className={\`whitespace-nowrap overflow-hidden transition-all duration-300 \${sidebarOpen ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0 hidden lg:block'}\`}>Déconnexion</span>`
);

// 6. Section Separators (Outils, Pilotage, Devis, Finance)
content = content.replace(
  /<p className="text-\[10px\] font-bold uppercase tracking-widest text-\[#5A7CA8\]">([^<]+)<\/p>/g,
  `<p className={\`text-[10px] font-bold uppercase tracking-widest text-[#5A7CA8] whitespace-nowrap overflow-hidden transition-all duration-300 \${sidebarOpen ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0 hidden lg:block'}\`}>$1</p>`
);

// 7. Make link container justify-center when collapsed
content = content.replace(
  /className=\{`flex items-center gap-3 px-4 py-2\.5 rounded-lg mb-1\.5 transition-all duration-300 \$\{/g,
  `className={\`flex items-center \${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 \${`
);

// 8. Fix Chevron icon in Devis menu
content = content.replace(
  /\{devisExpanded \? <ChevronDown size=\{16\} \/> : <ChevronRight size=\{16\} \/>\}/g,
  `{sidebarOpen && (devisExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}`
);

// 9. Fix the Devis button container (not a Link)
content = content.replace(
  /className="w-full flex items-center justify-between px-4 py-2\.5 rounded-lg mb-1 transition-all hover:translate-x-1 hover:bg-\[var\(--color-secondary\)\] text-gray-400 hover:text-white"/g,
  `className={\`w-full flex items-center \${sidebarOpen ? 'justify-between px-4' : 'justify-center'} py-2.5 rounded-lg mb-1 transition-all hover:translate-x-1 hover:bg-[var(--color-secondary)] text-gray-400 hover:text-white\`}`
);
content = content.replace(
  /<div className="flex items-center gap-3">/g,
  `<div className={\`flex items-center \${sidebarOpen ? 'gap-3' : ''}\`}>`
);


// 10. Fix sub-menus in Devis
content = content.replace(
  /className=\{`flex items-center gap-2\.5 px-3 py-2 rounded-md text-sm transition-all duration-300 \$\{/g,
  `className={\`flex items-center \${sidebarOpen ? 'gap-2.5 px-3' : 'justify-center'} py-2 rounded-md text-sm transition-all duration-300 \${`
);
content = content.replace(
  /<span>\{item\.label\}<\/span>/g,
  `<span className={\`whitespace-nowrap overflow-hidden transition-all duration-300 \${sidebarOpen ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0 hidden lg:block'}\`}>{item.label}</span>`
);


fs.writeFileSync('src/components/Layout.jsx', content);
console.log('Layout updated for collapsible sidebar');
