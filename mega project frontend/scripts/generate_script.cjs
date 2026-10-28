const fs = require('fs');

let content = fs.readFileSync('src/components/MagnetosphereView.tsx', 'utf8');

content = content.replace(
  `import { Play, Pause, Zap, Compass, RotateCcw } from 'lucide-react';`,
  `import { Play, Pause, Zap, Compass, RotateCcw } from 'lucide-react';
import { GlobeSatellites } from './GlobeSatellites';`
);

content = content.replace(
  `const canvasRef = useRef<HTMLCanvasElement>(null);`,
  `const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 580, height: 320 });`
);

content = content.replace(
  `const render = () => {`,
  `const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      const currentRePx = Math.max(12, height / 25);
      const cx = width / 2 + 50;
      const cy = height / 2;`
);

content = content.replace(
  `      const width = canvas.width;
      const height = canvas.height;
      
      // Clean canvas with deep stellar dark color
      ctx.fillStyle = '#04060d'; 
      ctx.fillRect(0, 0, width, height);

      // Radar rings & polar coordinate grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const center = { x: width / 2 + 50, y: height / 2 }; // Earth center offset to make space for magnetotail
      
      for (let r = 50; r < 350; r += 50) {`,
  `      // Clean canvas
      ctx.clearRect(0, 0, width, height);

      // Radar rings & polar coordinate grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const center = { x: cx, y: cy }; 
      
      for (let r = Math.floor(currentRePx * 2); r < Math.max(width, height); r += Math.floor(currentRePx * 2)) {`
);

content = content.replace(
  `      // Draw Earth (radius mapping: 1 Re = 12 pixels)
      const rePx = 12;`,
  `      // Draw Earth (radius mapping: 1 Re = currentRePx pixels)
      const rePx = currentRePx;`
);


// Removing the old Earth body drawing
content = content.replace(
  `      // Earth body core detail
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(center.x, center.y, rePx, 0, Math.PI * 2);
      ctx.stroke();

      // Day-Night side split representation
      ctx.fillStyle = '#ffffff'; // White Sunward Halfshell
      ctx.beginPath();
      ctx.arc(center.x, center.y, rePx, Math.PI / 2, -Math.PI / 2);
      ctx.fill();
      
      ctx.fillStyle = '#1c1c1c'; // Dark Magnetosphere Halfshell
      ctx.beginPath();
      ctx.arc(center.x, center.y, rePx, -Math.PI / 2, Math.PI / 2);
      ctx.fill();`,
  `      // Earth body is now rendered via GlobeSatellites overlay HTML`
);

content = content.replace(
  `    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [Bz, Nsw, Vsw, isPlaying, selectedSatelliteLong, satelliteAngle, boundaryCompressedPastGEO, r0]);`,
  `    const handleResize = () => {
      if (containerRef.current && canvas) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvas.width = clientWidth;
        canvas.height = clientHeight;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };
    
    // Initial size
    handleResize();
    
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);

    render();

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, [Bz, Nsw, Vsw, isPlaying, selectedSatelliteLong, satelliteAngle, boundaryCompressedPastGEO, r0]);`
);

content = content.replace(
  `  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative flex-1 rounded-sm border border-white/10 bg-slate-950/45 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={580}
          height={320}
          className="w-full h-full block"
        />`,
  `  const currentRePx = Math.max(12, dimensions.height / 25);
  const globeSize = currentRePx * 2.2;
  const globeLeft = dimensions.width / 2 + 50;
  
  return (
    <div className="flex flex-col gap-2 h-full">
      <div ref={containerRef} className="relative flex-1 rounded-sm border border-white/10 bg-[#04060d] overflow-hidden">
        
        {/* The interactive 3D Globe at the center replacing earth */}
        <div 
          className="absolute z-10 pointer-events-auto transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: \`\${globeLeft}px\`,
            top: '50%',
            width: \`\${globeSize}px\`,
            height: \`\${globeSize}px\`
          }}
        >
          <GlobeSatellites 
            speed={isPlaying ? 0.005 : 0} 
            className="w-full h-full"
            markers={[
              { id: "sat-1", location: [10, selectedSatelliteLong] },
              { id: "sat-2", location: [0, 285] }
            ]}
          />
        </div>

        <canvas
          ref={canvasRef}
          className="w-full h-full block absolute inset-0 z-20 pointer-events-none"
        />`
);

fs.writeFileSync('src/components/MagnetosphereView.tsx', content);
console.log("Success");
