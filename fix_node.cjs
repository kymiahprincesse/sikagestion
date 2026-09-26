const fs = require('fs');
const path = require('path');

const replacements = {
    'Ã©': 'é',
    'Ã\xa0': 'à',
    'Ã ': 'à',
    'Ã¨': 'è',
    'Ã§': 'ç',
    'Ãª': 'ê',
    'Ã®': 'î',
    'Ã¢': 'â',
    'Ã´': 'ô',
    'Ã»': 'û',
    'Ã‰': 'É',
    'Ã€': 'À',
    'Ãˆ': 'È',
    'Ã‡': 'Ç',
    'Ãœ': 'Ü',
    'Ã¯': 'ï',
    'Ã¶': 'ö',
    'Ã¼': 'ü',
    'ÃŠ': 'Ê',
    'ÃŽ': 'Î',
    'Ã”': 'Ô',
    'Ã›': 'Û'
};

function walkSync(dir, callback) {
    fs.readdirSync(dir).forEach(file => {
        let filepath = path.join(dir, file);
        let stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            walkSync(filepath, callback);
        } else {
            callback(filepath);
        }
    });
}

function fixFile(filepath) {
    if (!filepath.match(/\.(js|jsx|ts|tsx|json|html|css|scss|md)$/)) return;
    try {
        let content = fs.readFileSync(filepath, 'utf-8');
        let changed = false;
        for (let bad in replacements) {
            if (content.includes(bad)) {
                content = content.split(bad).join(replacements[bad]);
                changed = true;
            }
        }
        if (changed) {
            fs.writeFileSync(filepath, content, 'utf-8');
            console.log('Fixed:', filepath);
        }
    } catch (e) {
        // ignore
    }
}

walkSync('src', fixFile);
['index.html', 'vite.config.js', 'package.json'].forEach(f => {
    if (fs.existsSync(f)) fixFile(f);
});

console.log('Done');
