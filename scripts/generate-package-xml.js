const fs = require('fs');
const path = require('path');

// Relative to metadata root (force-app/main/default/*)
const metadataTypeMap = {
  'classes': 'ApexClass',
  'triggers': 'ApexTrigger',
  'pages': 'ApexPage',
  'components': 'AuraComponent',
  'aura': 'AuraComponent',
  'lwc': 'LightningComponentBundle',
  'objects': 'CustomObject',
  'layouts': 'Layout',
  'permissionsets': 'PermissionSet',
  'profiles': 'Profile',
  'staticresources': 'StaticResource',
  'flows': 'Flow',
  'applications': 'CustomApplication',
  'tabs': 'CustomTab',
  'labels': 'CustomLabels',
  'pathAssistants': 'PathAssistant',
  'reportTypes': 'ReportType',
  'notificationtypes': 'CustomNotificationType',
  // Add more as needed...
};

// Helper to clean member names
function extractMember(filePath) {
  return path.basename(filePath)
    .replace(/\.xml$/, '')
    .replace(/\.cls$/, '')
    .replace(/\.trigger$/, '')
    .replace(/\.page$/, '')
    .replace(/\.component$/, '')
    .replace(/\.app$/, '')
    .replace(/\.layout$/, '')
    .replace(/\.object$/, '')
    .replace(/-meta$/, '');
}

// Input/output paths
const [inputFile, outputFile] = process.argv.slice(2);
if (!fs.existsSync(inputFile)) {
  console.error(`❌ ERROR: Input file "${inputFile}" does not exist.`);
  process.exit(1);
}

const changedFiles = fs.readFileSync(inputFile, 'utf-8')
  .split('\n')
  .filter(Boolean);

const membersByType = {};

changedFiles.forEach(filePath => {
  // Normalize slashes
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Extract folder name (after force-app/main/default/)
  const match = normalizedPath.match(/force-app\/main\/default\/([^/]+)\/([^/]+)/);
  if (!match) return;

  const [_, folder, fileOrDir] = match;

  const metadataType = metadataTypeMap[folder];
  if (!metadataType) return;

  // Metadata name logic
  let memberName;
  if (metadataType === 'LightningComponentBundle' || metadataType === 'AuraComponent') {
    // Bundle components: use folder name
    const parts = normalizedPath.split('/');
    memberName = parts[4]; // force-app/main/default/lwc/<COMPONENT_NAME>/file.js
  } else {
    memberName = extractMember(fileOrDir);
  }

  if (!membersByType[metadataType]) {
    membersByType[metadataType] = new Set();
  }
  membersByType[metadataType].add(memberName);
});

// Write to package.xml
const typesXml = Object.entries(membersByType)
  .map(([type, membersSet]) => {
    const membersXml = [...membersSet]
      .map(m => `    <members>${m}</members>`)
      .join('\n');
    return `  <types>\n${membersXml}\n    <name>${type}</name>\n  </types>`;
  }).join('\n');

const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
${typesXml}
  <version>58.0</version>
</Package>`;

fs.writeFileSync(outputFile, packageXml);
console.log('✅ package.xml was generated successfully.');
