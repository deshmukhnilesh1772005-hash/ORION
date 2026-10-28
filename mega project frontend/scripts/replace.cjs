const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const startMarker = '{/* Main Desktop Operating Space Canvas */}';
const endMarker = '{/* Workspace Active Dock (Bottom taskbar status bar) */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  
  const insert = `      {/* Main Container - Desktop Environment using the 3D Stacking Workspace */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center -mt-8">
        <WindowWorkspace
          windowOrder={windowOrder.filter(id => openWindows[id as keyof typeof openWindows])}
          activeWindow={activeWindow}
          renderWindow={renderWindowContent}
        />
      </div>

      `;
      
  fs.writeFileSync('src/App.tsx', before + insert + after);
  console.log("Success");
} else {
  console.log("Hooks not found");
}
