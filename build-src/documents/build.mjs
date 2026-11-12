import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
let dependencyPackage = new URL('./package.json', import.meta.url);
let require = createRequire(dependencyPackage);
try { require.resolve('esbuild'); } catch {
 dependencyPackage = new URL('../../.draft/build-documents/package.json', import.meta.url);
 require = createRequire(dependencyPackage);
}
const { build } = require('esbuild');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dependencies = path.join(path.dirname(fileURLToPath(dependencyPackage)), 'node_modules');
const destination = path.join(project, 'vendor/documents');
await fs.mkdir(destination, { recursive: true });
const entries = {
 'docx-read': "import mammoth from 'mammoth'; export const extractRawText = mammoth.extractRawText;",
 'docx-write': "export { Document, Paragraph, TextRun, Packer } from 'docx';",
 'pdf-write': "export { PDFDocument, rgb } from 'pdf-lib'; export { default as fontkit } from '@pdf-lib/fontkit';",
};
const packageRoots = new Set();
for (const [name, contents] of Object.entries(entries)) {
 const result = await build({stdin:{contents,resolveDir:dependencies,sourcefile:name+'.js'},bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,metafile:true,legalComments:'eof',outfile:path.join(destination,name+'.js')});
 for (const input of Object.keys(result.metafile.inputs)) {
  if (!input.includes('node_modules')) continue;
  let dir = path.dirname(path.resolve(input));
  for (let i=0; i<15; i++) {
   try { await fs.access(path.join(dir,'package.json')); packageRoots.add(dir); break; } catch {}
   const parent = path.dirname(dir); if(parent===dir) break; dir=parent;
  }
 }
}
const pdfRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
packageRoots.add(pdfRoot);
for(const file of ['pdf.mjs','pdf.worker.mjs']) await fs.copyFile(path.join(pdfRoot,'legacy/build',file),path.join(destination,file));
for(const dir of ['standard_fonts','cmaps']) await fs.cp(path.join(pdfRoot,dir),path.join(destination,dir),{recursive:true});
await fs.copyFile(path.join(project,'assets/fonts/lora.ttf'),path.join(destination,'Lora-Regular.ttf'));
await fs.copyFile(path.join(project,'assets/fonts/lora-OFL.txt'),path.join(destination,'Lora-OFL.txt'));
let licenses = 'Third-party libraries for Obsidian Ink document conversion\n\n';
for(const root of [...packageRoots].sort()) {
 const pkg = JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 if (pkg.private) continue;
 licenses += `\n=== ${pkg.name} ${pkg.version} | ${pkg.license || 'See included license'} ===\n`;
 const files = await fs.readdir(root);
 const found = files.filter(file=>/^(license|licence|copying|copyright|notice)(\.|$|-)/i.test(file));
 for(const file of found) {
  const stat=await fs.stat(path.join(root,file));
  if(stat.isFile()) licenses += '\n'+file+'\n'+await fs.readFile(path.join(root,file),'utf8')+'\n';
 }
 if(!found.length) licenses += `Repository: ${JSON.stringify(pkg.repository || pkg.homepage || '')}\n`;
}
for (const file of ['fontkit-LICENSE.txt', 'core-js-LICENSE.txt']) {
 licenses += '\n=== Additional upstream notice: '+file+' ===\n'+await fs.readFile(path.join(destination,file),'utf8')+'\n';
}
await fs.writeFile(path.join(destination,'THIRD-PARTY-LICENSES.txt'),licenses);
console.log('Built document vendors.', [...packageRoots].length,'licensed dependencies.');
