import React, { useState, useEffect, useRef } from 'react';
import ModelContainer from './ModelContainer';

// Define asset paths
const ASSETS = {
  FOOD_GARBAGE: '/food_garbage.glb',
  FOOD: '/food.glb',
};

const FoodModelContainer = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const containerRef = useRef(null);
  
  // Auto rotation effect - only when autoRotate is true
  useEffect(() => {
    let rotationInterval;
    if (autoRotate) {
      rotationInterval = setInterval(() => {
        setRotation(prev => (prev + 0.01) % (Math.PI * 2));
      }, 50);
    }
    
    return () => clearInterval(rotationInterval);
  }, [autoRotate]);
  
  // Separate model configs for each model
  const foodGarbageModel = {
    staticModelPath: ASSETS.FOOD_GARBAGE,
    position: [0, -1.5, 0],
    rotation: [0, rotation, 0], // Dynamic rotation
    scale: 2, // Adjusted scale for garbage model
    isStatic: true
  };
  
  const foodModel = {
    staticModelPath: ASSETS.FOOD,
    position: [0, -1.5, 0],
    rotation: [0, rotation, 0], // Dynamic rotation
    scale: 10, // Different scale for food model
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
      className="food-model-container"
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <ModelContainer 
        models={[isHovered ? foodModel : foodGarbageModel]}
        height="100%"
        className="right-model-viewer"
        backgroundColor="#000"
        enableOrbitControls={true}
      />
      
      {/* Top text - larger font */}
      <div className="model-text-top" style={{ fontSize: "3rem", fontWeight: "900" }}>
        {isHovered ? "TO" : "FROM"}
      </div>
      
      {/* Bottom text - larger font */}
      <div className="model-text-bottom" style={{ fontSize: "3rem", fontWeight: "900" }}>
        THIS
      </div>
    </div>
  );
};

export default FoodModelContainer;