const fs = require('fs');

function resolveConflicts(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Regex to match git conflict markers
  const conflictRegex = /<<<<<<<[^\n]*\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>>[^\n]*\n/g;
  
  // Replace with the second group (origin/main)
  const resolved = content.replace(conflictRegex, '$2');
  
  if (content !== resolved) {
    fs.writeFileSync(filePath, resolved, 'utf8');
    console.log(`Resolved conflicts in ${filePath}`);
  } else {
    console.log(`No conflicts found in ${filePath}`);
  }
}

const files = [
  'app/(tabs)/_layout.web.tsx',
  'components/DashboardShell.tsx',
  'components/WebShell.tsx',
  'app/(tabs)/index.web.tsx'
];

for (const file of files) {
  resolveConflicts(file);
}
