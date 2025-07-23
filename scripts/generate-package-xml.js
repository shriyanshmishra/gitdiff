// scripts/generate-package-xml.js

const fs = require('fs');
const path = require('path');

// Map folder paths and extensions to metadata types
const metadataMap = [
  { dir: 'force-app/main/default/classes/', ext: '.cls', type: 'ApexClass' },
  { dir: 'force-app/main/default/triggers/', ext: '.trigger', type: 'ApexTrigger' },
  { dir: 'force-app/main/default/pages/', ext: '.page', type: 'ApexPage' },
  { dir: 'force-app/main/default/components/', ext: '.component', type: 'AuraComponent' },
  { dir: 'force-app/main/default/lwc/', ext: '', type: 'LightningComponentBundle' },
];

const [inputFile, outputFile] = process.argv.slice(2);
if (!inputFile || !outputFile) {
  console.error('❗ Usage: node generate-package-xml.js <input.txt> <output.xml>');
  process.exit(1);
}

const changedFiles = fs.readFileSync(inputFile, 'utf-8').split('\n').filter(Boolean);
const membersByType = {};

changedFiles.forEach(filePath => {
  for (const { dir, ext, type } of metadataMap) {
    if (filePath.startsWith(dir) && (ext === '' || filePath.endsWith(ext))) {
      const memberName = path.basename(filePath, path.extname(filePath));
      if (!membersByType[type]) membersByType[type] = new Set();
      membersByType[type].add(memberName);
    }
  }
});

const typesXml = Object.entries(membersByType).map(([type, members]) => {
  const membersXml = Array.from(members)
    .map(member => `    <members>${member}</members>`)
    .join('\n');
  return `  <types>\n${membersXml}\n    <name>${type}</name>\n  </types>`;
}).join('\n');

const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
${typesXml}
  <version>58.0</version>
</Package>`;

fs.writeFileSync(outputFile, packageXml);
