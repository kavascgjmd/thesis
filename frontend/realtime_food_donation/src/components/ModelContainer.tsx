import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, useProgress, PerspectiveCamera } from '@react-three/drei';
import ModelViewer from './ModelViewer';
import StaticModelViewer from './StaticModelViewer';
import * as THREE from 'three';

interface ModelConfig {
  modelPath?: string;
  animationPath?: string;
  alternateAnimationPath?: string; // Added this line for alternate animation
  staticModelPath?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  guitarModelPath?: string;
  debugMode?: boolean;
  isStatic?: boolean;
  modelName?: string; // Added model name for identification
}

interface ModelContainerProps {
  className?: string;
  models: ModelConfig[];
  height?: string;
  backgroundColor?: string;
}

// Custom loading component
const Loader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="loading-container">
        <p>Loading 3D Experience</p>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p>{progress.toFixed(0)}%</p>
      </div>
    </Html>
  );
};

// Custom camera component with cinematic positioning
const CinematicCamera = () => {
  return (
    <PerspectiveCamera
      makeDefault
      position={[0, 2, 10]} // Raised and further back for more theatrical view
      fov={35} // Narrower FOV for cinematic look
      near={0.1}
      far={1000}
    />
  );
};

const ModelContainer = ({
  className = '',
  models,
  height = '400px',
  backgroundColor = '#1a1a1a'
}: ModelContainerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Delay rendering to ensure component is mounted properly
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle canvas errors
  const handleCanvasError = (err: Error) => {
    console.error('Canvas error:', err);
    setError('Failed to initialize 3D viewer. Your browser may not support WebGL.');
  };

  if (error) {
    return (
      <div className="error-container" style={{ height, backgroundColor }}>
        <div className="error-message">
          <h3>3D Viewer Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="loading-container" style={{ height, backgroundColor, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading-spinner"></div>
        <p>Preparing 3D environment...</p>
      </div>
    );
  }

  return (
    <div className="cinematic-container" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#000', 
      height 
    }}>
      {/* Inner container with aspect ratio and letterbox effect */}
      <div className={`model-container ${className}`} style={{ 
        width: '80%', 
        height: '80%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '4px',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
      }}>
        <Canvas
          shadows
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color(backgroundColor));
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.toneMappingExposure = 1.2; // Slightly brighter exposure
          }}
          onError={handleCanvasError}
        >
          {/* Custom cinematic camera */}
          <CinematicCamera />
          
          {/* Enhanced lighting setup for dramatic effect */}
          <ambientLight intensity={0.3} /> {/* Reduced ambient for more contrast */}
          
          {/* Main key light from front right */}
          <directionalLight 
            position={[5, 5, 5]} 
            intensity={1.2} 
            castShadow 
            shadow-mapSize-width={1024} 
            shadow-mapSize-height={1024}
            color="#fff2e6" // Slightly warm key light
          />
          
          {/* Fill light from left */}
          <pointLight position={[-5, 3, 1]} intensity={0.4} color="#e6f0ff" /> {/* Cool fill light */}
          
          {/* Back rim light */}
          <pointLight position={[0, 4, -6]} intensity={0.5} color="#ffe6cc" /> {/* Warm rim light */}
          
          {/* Atmospheric fog effect */}
          <fog attach="fog" args={['#101010', 10, 30]} />
          
          {/* Ground plane to receive shadows */}
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -1.85, 0]} 
            receiveShadow
          >
            <planeGeometry args={[100, 100]} />
            <shadowMaterial opacity={0.2} />
          </mesh>
          
          {/* Models with loading indicator */}
          <Suspense fallback={<Loader />}>
            {models.map((model, index) => {
              // Handle static models (like the Marshall amp) differently
              if (model.isStatic && model.staticModelPath) {
                return (
                  <StaticModelViewer
                    key={`static-model-${index}`}
                    modelPath={model.staticModelPath}
                    position={model.position}
                    rotation={model.rotation}
                    scale={model.scale}
                  />
                );
              } else {
                // Regular animated models
                return (
                  <ModelViewer
                    key={`model-${index}`}
                    modelPath={model.modelPath || ''}
                    animationPath={model.animationPath || ''}
                    alternateAnimationPath={model.alternateAnimationPath || ''} // Pass the alternate animation path
                    position={model.position}
                    rotation={model.rotation}
                    scale={model.scale}
                    guitarModelPath={model.guitarModelPath}
                    debugMode={model.debugMode}
                    modelName={model.modelName || ''} // Pass model name for identification
                  />
                );
              }
            })}
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default ModelContainer;