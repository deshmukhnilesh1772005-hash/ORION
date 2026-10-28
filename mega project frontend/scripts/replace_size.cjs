const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/defaultSize=\{\{ width: \d+, height: \d+ \}\}/g, 'defaultSize={{ width: 650, height: 450 }}');

fs.writeFileSync('src/App.tsx', content);
console.log("Success");
