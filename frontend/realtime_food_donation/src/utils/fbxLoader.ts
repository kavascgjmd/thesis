import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

// Cache for loaded models
const modelCache: Record<string, THREE.Group> = {};
const animationCache: Record<string, THREE.AnimationClip[]> = {};
const mtlCache: Record<string, THREE.Material[]> = {};

/**
 * Load an FBX model
 */
export const loadFbxModel = (
  url: string, 
  useCache: boolean = true
): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    // Check cache first if caching is enabled
    if (useCache && modelCache[url]) {
      console.log(`Retrieved model from cache: ${url}`);
      const cachedModel = modelCache[url].clone();
      resolve(cachedModel);
      return;
    }
    
    const loader = new FBXLoader();
    
    loader.load(
      url,
      (fbxModel) => {
        console.log(`FBX model loaded: ${url}`);
        
        // Store in cache if caching is enabled
        if (useCache) {
          modelCache[url] = fbxModel.clone();
        }
        
        resolve(fbxModel);
      },
      (progress) => {
        // Optional: handle progress
      },
      (error) => {
        console.error(`Error loading FBX model: ${url}`, error);
        reject(error);
      }
    );
  });
};

/**
 * Load an FBX animation
 */
export const loadFbxAnimation = (
  url: string,
  useCache: boolean = true
): Promise<THREE.AnimationClip[]> => {
  return new Promise((resolve, reject) => {
    // Check cache first if caching is enabled
    if (useCache && animationCache[url]) {
      console.log(`Retrieved animation from cache: ${url}`);
      // Clone the animation clips
      const cachedClips = animationCache[url].map(clip => THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(clip)));
      resolve(cachedClips);
      return;
    }
    
    const loader = new FBXLoader();
    
    loader.load(
      url,
      (animationFbx) => {
        console.log(`FBX animation loaded: ${url}`);
        
        const animations = animationFbx.animations;
        
        // Store in cache if caching is enabled
        if (useCache && animations.length > 0) {
          animationCache[url] = animations.map(clip => THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(clip)));
        }
        
        resolve(animations);
      },
      (progress) => {
        // Optional: handle progress
      },
      (error) => {
        console.error(`Error loading FBX animation: ${url}`, error);
        reject(error);
      }
    );
  });
};

/**
 * Load a GLTF/GLB model
 */
export const loadGltfModel = (
  url: string,
  useCache: boolean = true
): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    // Check cache first if caching is enabled
    if (useCache && modelCache[url]) {
      console.log(`Retrieved GLTF/GLB model from cache: ${url}`);
      const cachedModel = modelCache[url].clone();
      resolve(cachedModel);
      return;
    }
    
    const loader = new GLTFLoader();
    
    loader.load(
      url,
      (gltf) => {
        console.log(`GLTF/GLB model loaded: ${url}`);
        
        const model = gltf.scene;
        
        // Store in cache if caching is enabled
        if (useCache) {
          modelCache[url] = model.clone();
        }
        
        resolve(model);
      },
      (progress) => {
        // Optional: handle progress
      },
      (error) => {
        console.error(`Error loading GLTF/GLB model: ${url}`, error);
        reject(error);
      }
    );
  });
};

/**
 * Load an OBJ model with materials from MTL file
 */
export const loadObjModel = (
  objUrl: string,
  mtlUrl?: string,
  textureBasePath: string = '',
  useCache: boolean = true
): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    // Check cache first if caching is enabled
    if (useCache && modelCache[objUrl]) {
      console.log(`Retrieved OBJ model from cache: ${objUrl}`);
      const cachedModel = modelCache[objUrl].clone();
      resolve(cachedModel);
      return;
    }
    
    // If MTL URL is provided, load materials first
    if (mtlUrl) {
      console.log(`Loading MTL file: ${mtlUrl}`);
      
      const mtlLoader = new MTLLoader();
      
      // Set texture base path if provided
      if (textureBasePath) {
        mtlLoader.setPath(textureBasePath);
      }
      
      mtlLoader.load(
        mtlUrl,
        (materials) => {
          materials.preload();
          
          // Now load the OBJ with materials
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          
          objLoader.load(
            objUrl,
            (objModel) => {
              console.log(`OBJ model loaded with MTL: ${objUrl}`);
              
              // Set up shadows and material properties
              objModel.traverse((child) => {
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
              
              // Cache the model
              if (useCache) {
                modelCache[objUrl] = objModel.clone();
              }
              
              resolve(objModel);
            },
            (progress) => {
              // Optional: handle progress
            },
            (error) => {
              console.error(`Error loading OBJ model: ${objUrl}`, error);
              reject(error);
            }
          );
        },
        undefined,
        (error) => {
          console.error(`Error loading MTL file: ${mtlUrl}`, error);
          
          // Try to load OBJ without materials if MTL fails
          console.log(`Attempting to load OBJ without materials: ${objUrl}`);
          loadObjWithoutMtl(objUrl, useCache).then(resolve).catch(reject);
        }
      );
    } else {
      // Load OBJ without materials
      loadObjWithoutMtl(objUrl, useCache).then(resolve).catch(reject);
    }
  });
};

/**
 * Helper function to load OBJ without materials
 */
const loadObjWithoutMtl = (
  objUrl: string,
  useCache: boolean = true
): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    const objLoader = new OBJLoader();
    
    objLoader.load(
      objUrl,
      (objModel) => {
        console.log(`OBJ model loaded without MTL: ${objUrl}`);
        
        // Set up shadows and apply default material
        objModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Apply a default material if none exists
            if (!child.material) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0xCCCCCC,
                roughness: 0.7,
                metalness: 0.2
              });
            }
            
            // Ensure double-sided rendering
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
        
        // Cache the model
        if (useCache) {
          modelCache[objUrl] = objModel.clone();
        }
        
        resolve(objModel);
      },
      (progress) => {
        // Optional: handle progress
      },
      (error) => {
        console.error(`Error loading OBJ model without MTL: ${objUrl}`, error);
        reject(error);
      }
    );
  });
};

/**
 * Preload multiple assets
 */
export const preloadAssets = (urls: string[]) => {
  console.log("Preloading assets:", urls);
  
  urls.forEach(url => {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (extension === 'fbx') {
      // For FBX files, check if it's likely an animation by name
      if (url.toLowerCase().includes('animation') || 
          url.toLowerCase().includes('anim') || 
          url.toLowerCase().includes('playing') || 
          url.toLowerCase().includes('dancing')) {
        loadFbxAnimation(url).catch(err => console.error(`Failed to preload animation: ${url}`, err));
      } else {
        loadFbxModel(url).catch(err => console.error(`Failed to preload model: ${url}`, err));
      }
    } else if (extension === 'glb' || extension === 'gltf') {
      loadGltfModel(url).catch(err => console.error(`Failed to preload GLTF/GLB model: ${url}`, err));
    } else if (extension === 'obj') {
      // For OBJ files, check if there's a matching MTL file
      const mtlUrl = url.replace('.obj', '.mtl');
      
      // Get base path for textures
      const textureBasePath = url.substring(0, url.lastIndexOf('/') + 1);
      
      // Try to load with MTL, but will fall back to without if MTL doesn't exist
      loadObjModel(url, mtlUrl, textureBasePath).catch(err => 
        console.error(`Failed to preload OBJ model: ${url}`, err));
    }
  });
};