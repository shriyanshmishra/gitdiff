// scripts/generate-package-xml.js

const fs = require('fs');
const path = require('path');

// Map file paths to metadata types
const metadataMap = [
  { dir: 'src/classes/', ext: '.cls', type: 'ApexClass' },
  { dir: 'src/triggers/', ext: '.trigger', type: 'ApexTrigger' },
  { dir: 'src/pages/', ext: '.page', type: 'ApexPage' },
  { dir: 'src/components/', ext: '.component', type: 'AuraComponent' },
  { dir: 'src/lwc/', ext: '', type: 'LightningComponentBundle' },
];

const [inputFile, outputFile] = process.argv.slice(2);
if (!inputFile || !outputFile) {
  console.error('Usage: node generate-package-xml.js changed_files.txt package.xml');
  process.exit(1);
}

const changedFiles = fs.readFileSync(inputFile, 'utf8').split('\n').filter(Boolean);
const membersByType = {};

changedFiles.forEach(filePath => {
  metadataMap.forEach(({ dir, ext, type }) => {
    if (filePath.startsWith(dir) && (ext === '' || filePath.endsWith(ext))) {
      const filename = path.basename(filePath, path.extname(filePath));
      membersByType[type] = membersByType[type] || new Set();
      membersByType[type].add(filename);
    }
  });
});

const typesBlock = Object.entries(membersByType).map(([type, membersSet]) => {
  const membersXml = [...membersSet].map(m => `    <members>${m}</members>`).join('\n');
  return `  <types>\n${membersXml}\n    <name>${type}</name>\n  </types>`;
}).join('\n');

const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
${typesBlock}
  <version>58.0</version>
</Package>`;

fs.writeFileSync(outputFile, packageXml);
