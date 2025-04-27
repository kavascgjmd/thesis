import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, useProgress, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import ModelViewer from './ModelViewer';
import EnhancedModelViewer from './EnhancedModelViewer';
import StaticModelViewer from './StaticModelViewer';
import ScrollAnimationController, { AnimationStage } from './ScrollAnimationController';
import * as THREE from 'three';

interface ModelConfig {
  modelPath?: string;
  animationPath?: string;
  alternateAnimationPath?: string;
  staticModelPath?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  guitarModelPath?: string;
  debugMode?: boolean;
  isStatic?: boolean;
  modelName?: string;
  // Scroll animation fields
  isScrollAnimated?: boolean;
  scrollAnimationPaths?: {
    turn: string;
    jump: string;
    throw: string;
    idle: string;
    default: string;
  };
  breakOutOfScreen?: boolean;
}

interface ModelContainerProps {
  className?: string;
  models: ModelConfig[];
  height?: string;
  backgroundColor?: string;
  enableScrollAnimation?: boolean;
  enableOrbitControls?: boolean;
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
  backgroundColor = '#1a1a1a',
  enableScrollAnimation = true,
  enableOrbitControls = false
}: ModelContainerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Animation state for scroll-based animations
  const [animationStage, setAnimationStage] = useState(AnimationStage.INSIDE_SCREEN);
  const [animationProgress, setAnimationProgress] = useState(0);
  
  // State to track if Sophie is outside the screen
  const [sophieOutsideScreen, setSophieOutsideScreen] = useState(false);

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
  
  // Modified handleAnimationChange function
  const handleAnimationChange = (stage: AnimationStage, progress: number) => {
    setAnimationStage(stage);
    setAnimationProgress(progress);
    
    // Adjust the condition to ensure smoother transition
    // Only set Sophie outside when significantly through the jumping animation
    setSophieOutsideScreen(
      (stage >= AnimationStage.JUMPING && progress > 0.3) || 
      stage > AnimationStage.JUMPING
    );
    
    if ((stage === AnimationStage.JUMPING && progress > 0.3) || stage > AnimationStage.JUMPING) {
      document.body.classList.add('character-breakout');
    } else {
      document.body.classList.remove('character-breakout');
    }
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

  // Split models into scroll-animated and regular models
  const scrollAnimatedModels = models.filter(model => model.isScrollAnimated);
  const regularModels = models.filter(model => !model.isScrollAnimated);

  return (
    <>
      {/* Add scroll animation controller if enabled */}
      {enableScrollAnimation && (
        <ScrollAnimationController 
          onChange={handleAnimationChange} 
          scrollTriggerElement=".fullscreen-model-section"
          startOffset={20}
          animationDuration={60}
        />
      )}
    
      <div className={`model-section ${sophieOutsideScreen ? 'sophie-outside' : ''}`}
        style={{ 
          backgroundColor: 'transparent', // CHANGE: Make background transparent to prevent white flash
          height,
          width: '100%',
          position: 'relative',
          overflow: 'visible'
        }}
      >
        {/* Outer Canvas for Sophie to appear on when she jumps out */}
        <div className="outer-canvas-container" style={{
          position: 'fixed', // CHANGE: Fixed position instead of absolute
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh', // CHANGE: Use viewport height to ensure full coverage
          zIndex: 20,
          pointerEvents: 'none',
          opacity: sophieOutsideScreen ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          backgroundColor: 'transparent' // CHANGE: Explicit transparent background
        }}>
          <Canvas
            shadows
            onCreated={({ gl }) => {
              // Make sure background is transparent, not white
              gl.setClearColor(new THREE.Color('transparent'));
              gl.setClearAlpha(0); // This is crucial to make it truly transparent
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
            }}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              backgroundColor: 'transparent' // CHANGE: Extra explicit transparency
            }}
          >
            <CinematicCamera />
            <ambientLight intensity={0.3} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
            
            {/* Render only Sophie in the outer canvas when she's jumping out */}
            <Suspense fallback={null}>
              {scrollAnimatedModels
                .filter(model => model.breakOutOfScreen && model.modelName === "Sophie")
                .map((model, index) => {
                  if (!model.scrollAnimationPaths) return null;
                  
                  // CHANGE: Adjust position to be more visible when outside
                  const outsidePosition: [number, number, number] = [
                    model.position[0],
                    model.position[1] + 2.5, // Move Sophie up to be more visible
                    model.position[2]  // Bring Sophie closer to the camera
                  ];
                  
                  return (
                    <EnhancedModelViewer
                      key={`outer-sophie-${index}`}
                      modelPath={model.modelPath || ''}
                      animationPaths={model.scrollAnimationPaths}
                      position={outsidePosition} // CHANGE: Use adjusted position
                      rotation={model.rotation}
                      scale={model.scale}
                      animationStage={animationStage}
                      animationProgress={animationProgress}
                      isBreakingOut={model.breakOutOfScreen}
                      modelName={model.modelName || ''}
                      debug={model.debugMode}
                    />
                  );
                })}
            </Suspense>
          </Canvas>
        </div>
        
        {/* Inner container - now with explicit background color */}
        <div 
          className={`model-container ${className} ${animationStage >= AnimationStage.OUT_OF_SCREEN ? 'breakout-active' : ''}`} 
          style={{ 
            width: '80%', 
            height: '80%',
            position: 'relative',
            overflow: 'visible',
            borderRadius: '4px',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            margin: '0 auto',
            zIndex: 10,
            backgroundColor, // CHANGE: Explicit background color
            transition: 'all 0.3s ease-in-out'
          }}
        >
          {/* Add crack effect for dramatic breakout */}
          <div className="crack-effect"></div>
          
          <Canvas
            shadows
            onCreated={({ gl }) => {
              gl.setClearColor(new THREE.Color(backgroundColor));
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
              gl.toneMappingExposure = 1.2; // Slightly brighter exposure
            }}
            onError={handleCanvasError}
            style={{ 
              width: '100%',
              height: '100%',
              position: 'relative'
            }}
          >
            {/* Custom cinematic camera */}
            <CinematicCamera />
            
            {/* OrbitControls - Only enabled when enableOrbitControls is true */}
            {enableOrbitControls && <OrbitControls />}
            
            {/* Enhanced lighting setup for dramatic effect */}
            <ambientLight intensity={0.3} /> 
            
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
            <pointLight position={[-5, 3, 1]} intensity={0.4} color="#e6f0ff" /> 
            
            {/* Back rim light */}
            <pointLight position={[0, 4, -6]} intensity={0.5} color="#ffe6cc" /> 
            
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
              {/* Render regular models */}
              {regularModels.map((model, index) => {
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
                  return (
                    <ModelViewer
                      key={`model-${index}`}
                      modelPath={model.modelPath || ''}
                      animationPath={model.animationPath || ''}
                      alternateAnimationPath={model.alternateAnimationPath || ''}
                      position={model.position}
                      rotation={model.rotation}
                      scale={model.scale}
                      guitarModelPath={model.guitarModelPath}
                      debugMode={model.debugMode}
                      modelName={model.modelName || ''}
                    />
                  );
                }
              })}
              
              {/* Only render Sophie in inner canvas when she's not jumping out */}
              {scrollAnimatedModels
                .filter(model => !(sophieOutsideScreen && model.breakOutOfScreen && model.modelName === "Sophie"))
                .map((model, index) => {
                  if (!model.scrollAnimationPaths) return null;
                  
                  return (
                    <EnhancedModelViewer
                      key={`scroll-model-${index}`}
                      modelPath={model.modelPath || ''}
                      animationPaths={model.scrollAnimationPaths}
                      position={model.position}
                      rotation={model.rotation}
                      scale={model.scale}
                      animationStage={animationStage}
                      animationProgress={animationProgress}
                      isBreakingOut={model.breakOutOfScreen}
                      modelName={model.modelName || ''}
                      debug={model.debugMode}
                    />
                  );
                })}
            </Suspense>
          </Canvas>
        </div>
      </div>
    </>
  );
};

export default ModelContainer;