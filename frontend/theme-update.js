const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');

const replacements = [
    { from: /text-white/g, to: 'text-slate-900' },
    { from: /text-slate-400/g, to: 'text-slate-500' },
    { from: /text-slate-300/g, to: 'text-slate-700' },
    { from: /from-blue-500 to-indigo-600/g, to: 'from-emerald-400 to-green-600' },
    { from: /from-indigo-500 to-purple-600/g, to: 'from-emerald-400 to-green-600' },
    { from: /shadow-indigo-500/g, to: 'shadow-emerald-500' },
    { from: /text-indigo-400/g, to: 'text-emerald-600' },
    { from: /hover:text-indigo-300/g, to: 'hover:text-emerald-500' },
    { from: /bg-indigo-500\/15/g, to: 'bg-emerald-500/15' },
    { from: /bg-slate-800\/50/g, to: 'bg-slate-100/50' },
    { from: /bg-slate-800\/60/g, to: 'bg-slate-100/60' },
    { from: /bg-slate-800\/40/g, to: 'bg-slate-100/40' },
    { from: /bg-slate-800\/30/g, to: 'bg-slate-100/30' },
    { from: /bg-slate-700\/60/g, to: 'bg-slate-200/60' },
    { from: /border-slate-800\/60/g, to: 'border-slate-200' },
    { from: /border-slate-700\/50/g, to: 'border-slate-200' },
    { from: /border-indigo-500/g, to: 'border-emerald-500' },
    { from: /bg-\[#0b1120\]/g, to: 'bg-white' },
    { from: /bg-\[#1a0a0a\]/g, to: 'bg-white' },
    { from: /bg-slate-800/g, to: 'bg-slate-200' },
    { from: /hover:bg-slate-800/g, to: 'hover:bg-slate-100' },
    { from: /hover:bg-slate-700/g, to: 'hover:bg-slate-200' },
    { from: /border-slate-500\/20/g, to: 'border-slate-200' },
    { from: /bg-slate-500\/10/g, to: 'bg-slate-50/50' }
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    replacements.forEach(r => {
        content = content.replace(r.from, r.to);
    });
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', file);
    }
});
