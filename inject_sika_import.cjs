const fs = require('fs');

const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

const importStr = "const SikaIntelligence      = lazyWithRetry(() => import('./modules/intelligence/SikaIntelligence'))\n";

if (!content.includes('const SikaIntelligence')) {
    content = content.replace(
        "const Rapport               = lazyWithRetry(() => import('./modules/rapport/Rapport'))",
        "const Rapport               = lazyWithRetry(() => import('./modules/rapport/Rapport'))\n" + importStr
    );
    fs.writeFileSync(path, content, 'utf8');
    console.log('SikaIntelligence import injected!');
} else {
    console.log('Already exists');
}
