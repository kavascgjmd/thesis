import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, useProgress } from '@react-three/drei';
import ModelViewer from './ModelViewer';
import StaticModelViewer from './StaticModelViewer'; // We'll create this component
import * as THREE from 'three';

interface ModelConfig {
  modelPath?: string;
  animationPath?: string;
  staticModelPath?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  guitarModelPath?: string;
  debugMode?: boolean;
  isStatic?: boolean;
}

interface ModelContainerProps {
  className?: string;
  models: ModelConfig[];
  height?: string;
  backgroundColor?: string;
}

// Custom loading component - This uses the useProgress hook, which must be inside a Canvas
const Loader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="loading-container">
        <p>Loading 3D Models</p>
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
    <div className={`model-container ${className}`} style={{ height }}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 5], fov: 50 }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(backgroundColor));
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        onError={handleCanvasError}
      >
        {/* Basic environment setup */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        
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
                  position={model.position}
                  rotation={model.rotation}
                  scale={model.scale}
                  guitarModelPath={model.guitarModelPath}
                  debugMode={model.debugMode}
                />
              );
            }
          })}
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ModelContainer;