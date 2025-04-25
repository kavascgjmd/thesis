import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Html } from '@react-three/drei';
import * as THREE from 'three';
import { loadFbxModel, loadFbxAnimation, loadGltfModel } from '../utils/fbxLoader';

interface ModelViewerProps {
  modelPath: string;
  animationPath: string;
  alternateAnimationPath?: string; // Add alternate animation path
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  guitarModelPath?: string;
  debugMode?: boolean;
  modelName?: string; // Add model name for identification
}

const ModelViewer = ({
  modelPath,
  animationPath,
  alternateAnimationPath,
  scale = 0.01,
  position = [0, -1, 0],
  rotation = [0, 0, 0],
  guitarModelPath,
  debugMode = false,
  modelName = ""
}: ModelViewerProps) => {
  const group = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [guitarModel, setGuitarModel] = useState<THREE.Group | null>(null);
  const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null);
  const [animations, setAnimations] = useState<THREE.AnimationClip[]>([]);
  const [alternateAnimations, setAlternateAnimations] = useState<THREE.AnimationClip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelScale, setModelScale] = useState(scale);
  const [isHovered, setIsHovered] = useState(false);
  
  // Animation action references for cleanup
  const primaryActionRef = useRef<THREE.AnimationAction | null>(null);
  const alternateActionRef = useRef<THREE.AnimationAction | null>(null);
  
  // Flag to track if alternate animation is loaded
  const hasAlternateAnimation = useRef(false);

  // Keep track of the bone we want to attach the guitar to
  const handBoneRef = useRef<THREE.Object3D | null>(null);

  // Guitar visibility settings
  const [guitarScale, setGuitarScale] = useState(150.0); // Start with a much larger scale
  const [guitarVisible, setGuitarVisible] = useState(true);
  const [debugBones, setDebugBones] = useState<THREE.Vector3[]>([]);
  const [guitarAttached, setGuitarAttached] = useState(false);

  // Helper function to determine file type
  const getFileType = (filePath: string): 'fbx' | 'gltf' | 'glb' | 'unknown' => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (extension === 'fbx') return 'fbx';
    if (extension === 'gltf') return 'gltf';
    if (extension === 'glb') return 'glb';
    return 'unknown';
  };

  // Load model and animations
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    console.log("Loading model and animation...");

    const loadAssets = async () => {
      try {
        // Load the character model first
        console.log(`Loading model from: ${modelPath}`);
        const loadedModel = await loadFbxModel(modelPath, false); // FBX is always used for character models
        
        if (!isMounted) return;
        console.log("Model loaded successfully");
        
        // Collection for debug bones
        const foundBones: THREE.Vector3[] = [];
        
        // Apply material settings and shadow settings
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
          
          // Store reference to hand bone for guitar attachment if this is Loba model
          if (guitarModelPath && child.name && 
             (child.name.toLowerCase().includes('hand') || 
              child.name.toLowerCase().includes('palm') || 
              child.name.toLowerCase().includes('wrist') || 
              child.name.toLowerCase().includes('finger'))) {
            
            console.log(`Found potential hand bone: ${child.name}`);
            
            // Store position for debugging
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            foundBones.push(worldPos);
            
            // Prioritize right hand bones
            if (child.name.toLowerCase().includes('right')) {
              handBoneRef.current = child;
              console.log("Selected right hand bone:", child.name);
            } else if (!handBoneRef.current) {
              handBoneRef.current = child;
              console.log("Selected hand bone:", child.name);
            }
          }
        });
        
        setDebugBones(foundBones);
        
        // Auto-adjust scale based on model size
        const boundingBox = new THREE.Box3().setFromObject(loadedModel);
        const modelSize = boundingBox.getSize(new THREE.Vector3());
        const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
        
        if (maxDimension > 100) {
          const newScale = 1 / (maxDimension / 2);
          setModelScale(newScale);
          console.log(`Auto-adjusting model scale to: ${newScale}`);
        }
        
        // Create animation mixer BEFORE loading animations
        const newMixer = new THREE.AnimationMixer(loadedModel);
        console.log("Created animation mixer");
        
        // Now load the primary animation
        console.log(`Loading primary animation from: ${animationPath}`);
        const animationClips = await loadFbxAnimation(animationPath, false); // Disable cache
        
        if (!isMounted) return;
        console.log(`Loaded ${animationClips.length} primary animations:`, 
          animationClips.map(clip => clip.name));
        
        // Load alternate animation if provided
        let alternateClips: THREE.AnimationClip[] = [];
        
        if (alternateAnimationPath) {
          console.log(`Loading alternate animation from: ${alternateAnimationPath}`);
          alternateClips = await loadFbxAnimation(alternateAnimationPath, false);
          
          if (!isMounted) return;
          console.log(`Loaded ${alternateClips.length} alternate animations:`, 
            alternateClips.map(clip => clip.name));
            
          setAlternateAnimations(alternateClips);
          
          if (alternateClips.length > 0) {
            hasAlternateAnimation.current = true;
          }
        }
        
        if (animationClips.length > 0) {
          // Animation loaded successfully
          setModel(loadedModel);
          setMixer(newMixer);
          setAnimations(animationClips);
          
          // Immediately start primary animation
          const primaryAction = newMixer.clipAction(animationClips[0]);
          primaryAction.reset();
          primaryAction.setLoop(THREE.LoopRepeat, Infinity);
          primaryAction.timeScale = 1.0;
          primaryAction.clampWhenFinished = true;
          primaryAction.play();
          primaryActionRef.current = primaryAction;
          
          console.log(`Playing primary animation: ${animationClips[0].name}`);
          
          // Also prepare the alternate animation if available
          if (alternateClips.length > 0) {
            const alternateAction = newMixer.clipAction(alternateClips[0]);
            alternateAction.reset();
            alternateAction.setLoop(THREE.LoopRepeat, Infinity);
            alternateAction.timeScale = 1.0;
            alternateAction.clampWhenFinished = true;
            alternateAction.weight = 0; // Start with weight 0 (not visible)
            alternateAction.play();     // Still play it to keep it ready
            alternateActionRef.current = alternateAction;
            
            console.log(`Prepared alternate animation: ${alternateClips[0].name}`);
          }
        } else {
          console.warn('No animations found in the FBX file');
          setModel(loadedModel); // Still show the model even without animation
        }
        
        // If guitar model path is provided, load the guitar model
        if (guitarModelPath) {
          try {
            console.log(`Loading guitar model from: ${guitarModelPath}`);
            let loadedGuitarModel: THREE.Group;
            
            // Determine what type of file the guitar is
            const guitarFileType = getFileType(guitarModelPath);
            
            // Load appropriate file type
            if (guitarFileType === 'fbx') {
              loadedGuitarModel = await loadFbxModel(guitarModelPath, false);
            } else if (guitarFileType === 'glb' || guitarFileType === 'gltf') {
              loadedGuitarModel = await loadGltfModel(guitarModelPath, false);
            } else {
              throw new Error(`Unsupported guitar model format: ${guitarFileType}`);
            }
            
            if (!isMounted) return;
            
            console.log("Guitar model loaded successfully");
            
            // Apply material settings for guitar
            loadedGuitarModel.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Make materials brighter to be more visible
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                      m.side = THREE.DoubleSide;
                      if (m.color) m.color.multiplyScalar(1.5); // Make brighter
                    });
                  } else {
                    child.material.side = THREE.DoubleSide;
                    if (child.material.color) child.material.color.multiplyScalar(1.5); // Make brighter
                  }
                }
              }
            });
            
            // Create a container for the guitar to help with positioning
            const guitarContainer = new THREE.Group();
            guitarContainer.add(loadedGuitarModel);
            
            // Set initial scale
            guitarContainer.scale.set(guitarScale, guitarScale, guitarScale);
            
            // Set rotation to make guitar stand out
            guitarContainer.rotation.set(
                12.976401224401672,           // x-axis: slight forward tilt (rests naturally)
                9.155751918948756, // y-axis: front of guitar visible
                1.476401224401701,     // z-axis rotation (slight tilt)
              'XYZ'
            );
            
            // Initial position offset from hand bone
            guitarContainer.position.set(0.8, 0.5, -0.5);
            
            setGuitarModel(guitarContainer);
          } catch (guitarErr) {
            console.error('Error loading guitar model:', guitarErr);
          }
        }
        
        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading model or animation:', err);
        setError('Failed to load 3D model or animation');
        setIsLoading(false);
      }
    };

    loadAssets();

    return () => {
      isMounted = false;
      // Clean up resources
      if (primaryActionRef.current) {
        primaryActionRef.current.stop();
      }
      if (alternateActionRef.current) {
        alternateActionRef.current.stop();
      }
      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot(mixer.getRoot());
      }
    };
  }, [modelPath, animationPath, alternateAnimationPath, guitarModelPath]);

  // Create keyboard controls for guitar debugging
  useEffect(() => {
    if (!guitarModel) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!guitarModel) return;
      
      // Guitar scale controls
      if (e.key === '+' || e.key === '=') {
        setGuitarScale(prev => prev * 1.2);
      } else if (e.key === '-') {
        setGuitarScale(prev => prev / 1.2);
      }
      
      // Toggle guitar visibility
      else if (e.key === 'g') {
        setGuitarVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [guitarModel]);

  // Attach guitar to hand bone once both are available
  useEffect(() => {
    if (guitarModel && handBoneRef.current && !guitarAttached) {
      // Add the guitar directly to the hand bone as a child
      handBoneRef.current.add(guitarModel);
      setGuitarAttached(true);
      console.log("Guitar attached to hand bone");
    }
  }, [guitarModel, guitarAttached]);

  // Handle hover state for animation switching
  useEffect(() => {
    if (!mixer || !primaryActionRef.current) return;
    if (!hasAlternateAnimation.current || !alternateActionRef.current) return;
    
    // Smoothly transition between animations
    const transitionDuration = 0.5; // in seconds
    
    if (isHovered) {
      // Transition to alternate animation
      primaryActionRef.current.fadeOut(transitionDuration);
      alternateActionRef.current.reset();
      alternateActionRef.current.setEffectiveWeight(1);
      alternateActionRef.current.fadeIn(transitionDuration);
      alternateActionRef.current.play();
    } else {
      // Transition back to primary animation
      alternateActionRef.current.fadeOut(transitionDuration);
      primaryActionRef.current.reset();
      primaryActionRef.current.setEffectiveWeight(1);
      primaryActionRef.current.fadeIn(transitionDuration);
      primaryActionRef.current.play();
    }
  }, [isHovered, mixer]);

  // Update animation mixer on each frame
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta);
    }
    
    // Update guitar scale and visibility if attached
    if (guitarModel) {
      // Apply current scale - note we're applying this directly to the guitar model
      guitarModel.scale.set(guitarScale, guitarScale, guitarScale);
      
      // Set visibility
      guitarModel.visible = guitarVisible;
    }
  });

  if (isLoading) {
    return null; // Or a loading indicator
  }

  if (error) {
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }

  // Determine if this model should have hover functionality
  const hasHoverAnimation = Boolean(alternateAnimationPath && hasAlternateAnimation.current);

  return (
    <group 
      ref={group} 
      position={position} 
      rotation={[rotation[0], rotation[1], rotation[2]]} 
      scale={modelScale}
      onPointerOver={() => hasHoverAnimation && setIsHovered(true)}
      onPointerOut={() => hasHoverAnimation && setIsHovered(false)}
    >
      {model && <primitive object={model} />}
      
      {/* Debug spheres showing hand bone positions */}
      {debugMode && debugBones.map((position, i) => (
        <Sphere key={`bone-${i}`} position={position} args={[0.2]}>
          <meshBasicMaterial color="red" wireframe />
        </Sphere>
      ))}
      
      {/* Debug info display */}
      {debugMode && (
        <Html position={[0, 2, 0]}>
          <div style={{ 
            background: 'rgba(0,0,0,0.7)', 
            color: 'white', 
            padding: '8px', 
            borderRadius: '4px',
            fontSize: '12px',
            width: '200px'
          }}>
            <p>Guitar Scale: {guitarScale.toFixed(2)}</p>
            <p>Guitar Visible: {guitarVisible ? 'Yes' : 'No'}</p>
            <p>Guitar Attached: {guitarAttached ? 'Yes' : 'No'}</p>
            <p>Hover State: {isHovered ? 'Hovered' : 'Normal'}</p>
            <p>Model Name: {modelName}</p>
            <p>Alternate Animation: {hasAlternateAnimation.current ? 'Available' : 'Not Available'}</p>
            <p>Controls:</p>
            <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
              <li>+/- : Scale guitar</li>
              <li>G: Toggle visibility</li>
              <li>Hover: Change animation (if available)</li>
            </ul>
          </div>
        </Html>
      )}
      
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        minDistance={2} 
        maxDistance={10}
        target={[0, 0, 0]} 
      />
    </group>
  );
};

export default ModelViewer;