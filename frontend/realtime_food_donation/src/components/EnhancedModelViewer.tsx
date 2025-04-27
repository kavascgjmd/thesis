import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Box } from '@react-three/drei';
import * as THREE from 'three';
import { loadFbxModel, loadFbxAnimation, loadGltfModel } from '../utils/fbxLoader';
import { AnimationStage } from './ScrollAnimationController';

interface EnhancedModelViewerProps {
  modelPath: string;
  animationPaths: {
    turn: string;     // Sophie turning animation
    jump: string;     // Sophie jumping animation
    thanking: string; // Sophie thanking animation
    pointing: string; // Sophie pointing animation
    idle: string;     // Sophie idle animation
    default: string;  // Default animation when not in scroll sequence
  };
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  animationStage?: AnimationStage;
  animationProgress?: number;
  isBreakingOut?: boolean; // Whether the model should break out of the screen
  modelName?: string;
  debug?: boolean;
}

const EnhancedModelViewer = ({
  modelPath,
  animationPaths,
  scale = 0.01,
  position = [0, -1, 0],
  rotation = [0, 0, 0],
  animationStage = AnimationStage.INSIDE_SCREEN,
  animationProgress = 0,
  isBreakingOut = false,
  modelName = "character",
  debug = false
}: EnhancedModelViewerProps) => {
  // Model and animation state
  const group = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null);
  
  // Animation clips
  const [turnAnimation, setTurnAnimation] = useState<THREE.AnimationClip | null>(null);
  const [jumpAnimation, setJumpAnimation] = useState<THREE.AnimationClip | null>(null);
  const [thankingAnimation, setThankingAnimation] = useState<THREE.AnimationClip | null>(null);
  const [pointingAnimation, setPointingAnimation] = useState<THREE.AnimationClip | null>(null);
  const [idleAnimation, setIdleAnimation] = useState<THREE.AnimationClip | null>(null);
  const [defaultAnimation, setDefaultAnimation] = useState<THREE.AnimationClip | null>(null);
  
  // Animation actions for controlling playback
  const turnActionRef = useRef<THREE.AnimationAction | null>(null);
  const jumpActionRef = useRef<THREE.AnimationAction | null>(null);
  const thankingActionRef = useRef<THREE.AnimationAction | null>(null);
  const pointingActionRef = useRef<THREE.AnimationAction | null>(null);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);
  const defaultActionRef = useRef<THREE.AnimationAction | null>(null);

  // Loading and error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Screen breaking effect state
  const [breakoutPosition, setBreakoutPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [breakoutRotation, setBreakoutRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [breakoutScale, setBreakoutScale] = useState<number>(scale);
  
  // Helper function to load an animation clip
  const loadAnimationClip = async (path: string): Promise<THREE.AnimationClip | null> => {
    try {
      const clips = await loadFbxAnimation(path, false);
      return clips.length > 0 ? clips[0] : null;
    } catch (err) {
      console.error(`Error loading animation from ${path}:`, err);
      return null;
    }
  };

  // Load model and animations
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    console.log(`[${modelName}] Loading model and animations...`);

    const loadAssets = async () => {
      try {
        // Load character model
        console.log(`[${modelName}] Loading model from: ${modelPath}`);
        const loadedModel = await loadFbxModel(modelPath, false);
        
        if (!isMounted) return;
        
        // Apply shadow and material settings
        loadedModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => {
                  m.side = THREE.DoubleSide;
                });
              } else {
                child.material.side = THREE.DoubleSide;
              }
            }
          }
        });
        
        // Create animation mixer
        const newMixer = new THREE.AnimationMixer(loadedModel);
        
        // Load all animation clips in parallel
        console.log(`[${modelName}] Loading animations...`);
        const [turnClip, jumpClip, thankingClip, pointingClip, idleClip, defaultClip] = await Promise.all([
          loadAnimationClip(animationPaths.turn),
          loadAnimationClip(animationPaths.jump),
          loadAnimationClip(animationPaths.thanking),
          loadAnimationClip(animationPaths.pointing),
          loadAnimationClip(animationPaths.idle),
          loadAnimationClip(animationPaths.default)
        ]);
        
        if (!isMounted) return;
        
        // Store the model and animations
        setModel(loadedModel);
        setMixer(newMixer);
        setTurnAnimation(turnClip);
        setJumpAnimation(jumpClip);
        setThankingAnimation(thankingClip);
        setPointingAnimation(pointingClip);
        setIdleAnimation(idleClip);
        setDefaultAnimation(defaultClip);
        
        // Create animation actions
        if (turnClip) {
          const action = newMixer.clipAction(turnClip);
          action.clampWhenFinished = true;
          action.loop = THREE.LoopOnce;
          turnActionRef.current = action;
        }
        
        if (jumpClip) {
          const action = newMixer.clipAction(jumpClip);
          action.clampWhenFinished = true;
          action.loop = THREE.LoopOnce;
          jumpActionRef.current = action;
        }
        
        if (thankingClip) {
          const action = newMixer.clipAction(thankingClip);
          action.loop = THREE.LoopRepeat; // Continuous looping for thanking animation
          thankingActionRef.current = action;
        }
        
        if (pointingClip) {
          const action = newMixer.clipAction(pointingClip);
          action.loop = THREE.LoopRepeat; // Continuous looping for pointing animation
          pointingActionRef.current = action;
        }
        
        if (idleClip) {
          const action = newMixer.clipAction(idleClip);
          action.loop = THREE.LoopRepeat;
          idleActionRef.current = action;
        }
        
        if (defaultClip) {
          const action = newMixer.clipAction(defaultClip);
          action.loop = THREE.LoopRepeat;
          defaultActionRef.current = action;
          
          // Start with default animation
          action.play();
        }
        
        setIsLoading(false);
        console.log(`[${modelName}] Model and animations loaded successfully`);
      } catch (err) {
        if (!isMounted) return;
        console.error(`[${modelName}] Error loading model or animations:`, err);
        setError('Failed to load 3D model or animations');
        setIsLoading(false);
      }
    };

    loadAssets();

    return () => {
      isMounted = false;
      // Clean up animations
      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot(mixer.getRoot());
      }
    };
  }, [modelPath, animationPaths, modelName]);

  // Handle animation stage changes
  useEffect(() => {
    if (!mixer || !model) return;
    
    const resetAllActions = () => {
      mixer.stopAllAction();
    };
    
    const crossFadeTo = (action: THREE.AnimationAction | null, duration: number = 0.5) => {
      if (!action) return;
      
      resetAllActions();
      action.reset();
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(1);
      action.fadeIn(duration);
      action.play();
    };
    
    // Calculate model position based on animation stage
    let newPosition: [number, number, number] = [...position];
    let newRotation: [number, number, number] = [...rotation]; 
    let newScale = scale;
    
    // Modified positioning logic for Sophie's breakout animation
    if (modelName === "Sophie" && isBreakingOut) {
      switch (animationStage) {
        case AnimationStage.INSIDE_SCREEN:
          // Default position inside the screen
          newPosition = [...position];
          newRotation = [...rotation];
          newScale = scale;
          if (defaultActionRef.current) {
            crossFadeTo(defaultActionRef.current);
          }
          break;
          
        case AnimationStage.TURNING:
          // Start turning animation - Sophie faces the camera
          if (turnActionRef.current) {
            crossFadeTo(turnActionRef.current);
            // Set animation time based on progress
            turnActionRef.current.time = turnActionRef.current.getClip().duration * animationProgress;
          }
          // Sophie moves slightly forward during turn
          newPosition = [
            position[0], 
            position[1], 
            position[2] + animationProgress * 1
          ];
          break;
          
        case AnimationStage.JUMPING:
          // Sophie jumps toward the camera - breaking out effect
          if (jumpActionRef.current) {
            crossFadeTo(jumpActionRef.current);
            jumpActionRef.current.time = jumpActionRef.current.getClip().duration * animationProgress;
          }
          
          // Original jumping position logic
          newPosition = [
            position[0], 
            position[1],
            position[2] 
          ];
      
          newRotation = [
            rotation[0],
            rotation[1] + Math.PI, // Rotate around Y axis based on progress
            rotation[2]
          ];
          // Keep the same scale
          newScale = scale;
          break;
          
        case AnimationStage.OUT_OF_SCREEN:
          // Sophie is fully out of the screen - brief transition state
          if (thankingActionRef.current) {
            // Prepare for thanking animation
            crossFadeTo(thankingActionRef.current);
          }
          
          // Position Sophie in the outer canvas
          newPosition = [
            position[0], // Keep horizontal position
            position[1], // Keep original height
            position[2]  // Fixed distance forward
          ];
          newRotation = [
            rotation[0],
            rotation[1] + Math.PI, // Rotate around Y axis based on progress
            rotation[2]
          ];
          
          // Keep original scale
          newScale = scale;
          break;
          
        case AnimationStage.THANKING:
          // Sophie performs thanking animation (continuous loop)
          if (thankingActionRef.current) {
            crossFadeTo(thankingActionRef.current);
          }
          
          // Keep Sophie in out-of-screen position
          newPosition = [
            position[0], 
            position[1],
            position[2] 
          ];
          newRotation = [
            rotation[0],
            rotation[1] + Math.PI, // Maintain the Y rotation
            rotation[2]
          ];
          newScale = scale;
          break;
          
        case AnimationStage.POINTING:
          // Sophie performs pointing animation (continuous loop)
          if (pointingActionRef.current) {
            crossFadeTo(pointingActionRef.current);
          }
          
          // Keep Sophie in out-of-screen position
          newPosition = [
            position[0], 
            position[1],
            position[2] 
          ];
          newRotation = [
            rotation[0],
            rotation[1] + Math.PI, // Maintain the Y rotation
            rotation[2]
          ];
          newScale = scale;
          break;
          
        case AnimationStage.IDLE:
          // Sophie in idle animation after completing sequence
          if (idleActionRef.current) {
            crossFadeTo(idleActionRef.current);
          }
          
          // Keep Sophie in out position
          newPosition = [
            position[0],
            position[1],
            position[2] 
          ];
          newRotation = [
            rotation[0],
            rotation[1] + Math.PI, // Maintain the Y rotation
            rotation[2]
          ];
          newScale = scale;
          break;
      }
    } else {
      // For other models or when not breaking out, use standard animation logic
      switch (animationStage) {
        case AnimationStage.INSIDE_SCREEN:
          if (defaultActionRef.current) {
            crossFadeTo(defaultActionRef.current);
          }
          break;
          
        case AnimationStage.TURNING:
          if (turnActionRef.current) {
            crossFadeTo(turnActionRef.current);
            turnActionRef.current.time = turnActionRef.current.getClip().duration * animationProgress;
          }
          break;
          
        case AnimationStage.JUMPING:
          if (jumpActionRef.current) {
            crossFadeTo(jumpActionRef.current);
            jumpActionRef.current.time = jumpActionRef.current.getClip().duration * animationProgress;
          }
          break;
          
        case AnimationStage.OUT_OF_SCREEN:
          if (thankingActionRef.current) {
            crossFadeTo(thankingActionRef.current);
          }
          break;
          
        case AnimationStage.THANKING:
          if (thankingActionRef.current) {
            crossFadeTo(thankingActionRef.current);
          }
          break;
          
        case AnimationStage.POINTING:
          if (pointingActionRef.current) {
            crossFadeTo(pointingActionRef.current);
          }
          break;
          
        case AnimationStage.IDLE:
          if (idleActionRef.current) {
            crossFadeTo(idleActionRef.current);
          }
          break;
      }
    }
    
    // Update position and scale for screen breaking effect
    setBreakoutPosition(newPosition);
    setBreakoutRotation(newRotation); 
    setBreakoutScale(newScale);
    
  }, [animationStage, animationProgress, mixer, model, isBreakingOut, position, rotation, scale, modelName]);

  // Update animation mixer on each frame
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta);
    }
  });

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }

  return (
    <group 
      ref={group} 
      position={breakoutPosition} 
      rotation={breakoutRotation} 
      scale={breakoutScale}
    >
      {model && <primitive object={model} />}
      
      {/* Debug visuals */}
      {debug && (
        <>
          <Box args={[1, 1, 1]} position={[0, 2, 0]}>
            <meshBasicMaterial wireframe color="yellow" />
          </Box>
          <axesHelper args={[5]} />
        </>
      )}
    </group>
  );
};

export default EnhancedModelViewer;