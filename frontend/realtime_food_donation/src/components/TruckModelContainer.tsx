import React, { useState, useEffect, useRef } from 'react';
import ModelContainer from './ModelContainer';

// Define asset paths
const ASSETS = {
  TRUCK: '/truck.glb',
};

const TruckModelContainer = () => {
  const [rotation, setRotation] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const containerRef = useRef(null);
  
  // Auto rotation effect - only when autoRotate is true
  useEffect(() => {
    let rotationInterval;
    if (autoRotate) {
      rotationInterval = setInterval(() => {
        setRotation(prev => (prev + 0.005) % (Math.PI * 2));
      }, 50);
    }
    
    return () => clearInterval(rotationInterval);
  }, [autoRotate]);
  
  // Truck model config
  const truckModel = {
    staticModelPath: ASSETS.TRUCK,
    position: [-0.5, -1.2, 0],
    rotation: [0, rotation, 0], // Dynamic rotation
    scale: 1.5,
    isStatic: true
  };
  
  // Handler to pause auto-rotation when interacting with OrbitControls
  const handleMouseDown = () => {
    setAutoRotate(false);
  };
  
  // Resume auto-rotation after a delay when interaction stops
  const handleMouseUp = () => {
    setTimeout(() => setAutoRotate(true), 3000);
  };
  
  return (
    <div 
      className="truck-model-container" 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <ModelContainer 
        models={[truckModel]}
        height="100%"
        className="left-model-viewer"
        backgroundColor="#161616"
        enableOrbitControls={true}
      />
      
    
    </div>
  );
};

export default TruckModelContainer;