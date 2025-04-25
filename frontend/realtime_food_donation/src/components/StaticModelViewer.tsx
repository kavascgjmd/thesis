import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { loadGltfModel, loadFbxModel, loadObjModel } from '../utils/fbxLoader';

interface StaticModelViewerProps {
  modelPath: string;
  mtlPath?: string;
  textureBasePath?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

const StaticModelViewer = ({
  modelPath,
  mtlPath,
  textureBasePath = '',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0
}: StaticModelViewerProps) => {
  const group = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get file type (helper function)
  const getFileType = (filePath: string): 'fbx' | 'gltf' | 'glb' | 'obj' | 'unknown' => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (extension === 'fbx') return 'fbx';
    if (extension === 'gltf') return 'gltf';
    if (extension === 'glb') return 'glb';
    if (extension === 'obj') return 'obj';
    return 'unknown';
  };

  // Load static model
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    console.log(`Loading static model from: ${modelPath}`);

    const loadModel = async () => {
      try {
        // Determine what type of file we're loading
        const fileType = getFileType(modelPath);
        let loadedModel: THREE.Group;
        
        // Load the appropriate file type
        if (fileType === 'glb' || fileType === 'gltf') {
          loadedModel = await loadGltfModel(modelPath, false);
        } else if (fileType === 'fbx') {
          loadedModel = await loadFbxModel(modelPath, false);
        } else if (fileType === 'obj') {
          // New OBJ loader with material support
          loadedModel = await loadObjModel(
            modelPath,
            mtlPath, // Optional MTL file path
            textureBasePath || undefined, // Base path for textures
            false // Don't use cache for now
          );
        } else {
          throw new Error(`Unsupported model format for static model: ${fileType}`);
        }
        
        if (!isMounted) return;
        console.log("Static model loaded successfully");
        
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
        });
        
        // Auto-adjust scale based on model size if scale is not provided
        const boundingBox = new THREE.Box3().setFromObject(loadedModel);
        const modelSize = boundingBox.getSize(new THREE.Vector3());
        const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
        
        if (maxDimension > 100 && scale === 1.0) {
          // Only auto-adjust if scale wasn't explicitly set
          const newScale = 1 / (maxDimension / 2);
          console.log(`Auto-adjusting static model scale to: ${newScale}`);
          loadedModel.scale.set(newScale, newScale, newScale);
        } else {
          // Use the provided scale
          loadedModel.scale.set(scale, scale, scale);
        }
        
        setModel(loadedModel);
        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading static model:', err);
        setError('Failed to load 3D model');
        setIsLoading(false);
      }
    };

    loadModel();

    return () => {
      isMounted = false;
    };
  }, [modelPath, mtlPath, textureBasePath, scale]);

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

  return (
    <group 
      ref={group} 
      position={position} 
      rotation={[rotation[0], rotation[1], rotation[2]]}
    >
      {model && <primitive object={model} />}
    </group>
  );
};

export default StaticModelViewer;