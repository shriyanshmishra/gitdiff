const fs = require('fs');
const path = require('path');

// Map folder name to metadata type
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
  'reportTypes': 'ReportType',
  'notificationtypes': 'CustomNotificationType',
  'flexipages': 'FlexiPage',
  'staticresources': 'StaticResource',
};

// Args
const [inputFile, outputFile, logFlag] = process.argv.slice(2);
if (!fs.existsSync(inputFile)) {
  console.error(`❌ Input file "${inputFile}" does not exist.`);
  process.exit(1);
}

const changedFiles = fs.readFileSync(inputFile, 'utf-8')
  .split('\n')
  .filter(Boolean);

const membersByType = {};

changedFiles.forEach(filePath => {
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Extract folder
  const match = normalizedPath.match(/force-app\/main\/default\/([^/]+)\/(.+)/);
  if (!match) return;

  const [_, folder, relativeFile] = match;

  const metadataType = metadataTypeMap[folder];
  if (!metadataType) return;

  let memberName;

  // Handle bundle-based (folder-based) components like LWC or Aura
  if (metadataType === 'LightningComponentBundle' || metadataType === 'AuraComponent') {
    const parts = normalizedPath.split('/');
    memberName = parts[4]; // e.g., 'myLwcComponent'
  } else if (metadataType === 'FlexiPage' && relativeFile.endsWith('-meta.xml')) {
    memberName = relativeFile.replace('.flexipage-meta.xml', '');
  } else {
    // Strip known extensions
    memberName = relativeFile
      .replace(/-meta\.xml$/, '')
      .replace(/\.(cls|trigger|page|component|app|layout|object|xml)$/i, '');
  }

  if (!membersByType[metadataType]) {
    membersByType[metadataType] = new Set();
  }
  membersByType[metadataType].add(memberName);

  // Optional logging
  if (logFlag === '--log-members-only') {
    console.log(`📦 ${metadataType}: ${memberName}`);
  }
});

// Convert to XML structure
const typesXml = Object.entries(membersByType)
  .map(([type, membersSet]) => {
    const membersXml = Array.from(membersSet).sort()
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
