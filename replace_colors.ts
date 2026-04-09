import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const replacements = [
  { regex: /text-indigo-600/g, replacement: 'text-primary' },
  { regex: /bg-indigo-600/g, replacement: 'bg-primary' },
  { regex: /hover:bg-indigo-700/g, replacement: 'hover:bg-primary-hover' },
  { regex: /hover:text-indigo-600/g, replacement: 'hover:text-primary' },
  { regex: /hover:text-indigo-800/g, replacement: 'hover:text-primary-hover' },
  { regex: /focus:ring-indigo-500/g, replacement: 'focus:ring-primary' },
  { regex: /focus:border-indigo-500/g, replacement: 'focus:border-primary' },
  { regex: /border-indigo-500/g, replacement: 'border-primary' },
  { regex: /text-indigo-700/g, replacement: 'text-primary-hover' },
  { regex: /bg-indigo-50/g, replacement: 'bg-primary/10' },
  { regex: /bg-indigo-100/g, replacement: 'bg-primary/20' },
  { regex: /hover:bg-indigo-100/g, replacement: 'hover:bg-primary/20' },
  { regex: /text-indigo-500/g, replacement: 'text-primary' },
  { regex: /bg-indigo-500/g, replacement: 'bg-primary' },
  { regex: /ring-indigo-500/g, replacement: 'ring-primary' },
  { regex: /text-slate-900/g, replacement: 'text-text-main' },
  { regex: /text-slate-800/g, replacement: 'text-text-main' },
  { regex: /text-slate-700/g, replacement: 'text-text-main' },
  { regex: /text-slate-600/g, replacement: 'text-secondary' },
  { regex: /text-slate-500/g, replacement: 'text-secondary' },
  { regex: /border-slate-200/g, replacement: 'border-muted/30' },
  { regex: /border-slate-300/g, replacement: 'border-muted' },
  { regex: /bg-slate-50/g, replacement: 'bg-background' },
];

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    replacements.forEach(({ regex, replacement }) => {
      content = content.replace(regex, replacement);
    });
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${filePath}`);
    }
  }
});
