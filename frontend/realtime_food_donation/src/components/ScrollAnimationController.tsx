import { useRef, useEffect, useState } from 'react';

// Animation sequence stages
export enum AnimationStage {
  INSIDE_SCREEN = 0,     // Sophie is inside the screen
  TURNING = 1,           // Sophie turns to face outward
  JUMPING = 2,           // Sophie jumps out of the screen
  OUT_OF_SCREEN = 3,     // Sophie is completely out of the screen
  THANKING = 4,          // Sophie thanking animation (replacing throwing)
  POINTING = 5,          // Sophie pointing animation
  IDLE = 6               // Sophie is in idle animation
}

interface ScrollAnimationControllerProps {
  onChange: (stage: AnimationStage, progress: number) => void;
  scrollTriggerElement?: string; // CSS selector for the scroll trigger element
  startOffset?: number; // When to start the animation (0-100 percentage of viewport)
  animationDuration?: number; // Duration of the animation in scroll percentage (0-100)
}

const ScrollAnimationController = ({
  onChange,
  scrollTriggerElement = '.fullscreen-model-section',
  startOffset = 20, // Start when element is 20% into the viewport
  animationDuration = 70 // Animation covers 70% of the scroll range
}: ScrollAnimationControllerProps) => {
  // Track animation progress
  const [stage, setStage] = useState(AnimationStage.INSIDE_SCREEN);
  const [progress, setProgress] = useState(0);
  
  // Element references
  const triggerRef = useRef<Element | null>(null);
  
  // Store animation thresholds with default values
  // These represent the scroll position (0-1) where each stage begins
  const thresholds = useRef({
    turning: 0.1,      // After 10% of scroll, start turning
    jumping: 0.2,      // After 20% of scroll, start jumping
    outOfScreen: 0.4,  // At 40% of scroll, she's out of screen
    thanking: 0.5,     // At 50% of scroll, start thanking animation
    pointing: 0.9,     // At 80% of scroll, start pointing animation
    idle: 1.2          // At 90% of scroll, enter idle state
  });
  
  // Setup scroll listener
  useEffect(() => {
    const calculateScrollProgress = () => {
      if (!triggerRef.current) return;
      
      // Get element position relative to viewport
      const element = triggerRef.current;
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate how far the element has been scrolled through the viewport
      // 0 = element just entered viewport from bottom
      // 1 = element has completely exited viewport from top
      let elementProgress = 1 - (rect.bottom / (viewportHeight + rect.height));
      
      // Apply offset and duration modifiers
      const adjustedProgress = (elementProgress - startOffset / 100) / (animationDuration / 100);
      const clampedProgress = Math.max(0, Math.min(1, adjustedProgress));
      
      // Determine animation stage based on thresholds
      let newStage = AnimationStage.INSIDE_SCREEN;
      let stageProgress = 0;
      
      if (clampedProgress >= thresholds.current.idle) {
        newStage = AnimationStage.IDLE;
        stageProgress = (clampedProgress - thresholds.current.idle) / 
                       (1 - thresholds.current.idle);
      } else if (clampedProgress >= thresholds.current.pointing) {
        newStage = AnimationStage.POINTING;
        stageProgress = (clampedProgress - thresholds.current.pointing) / 
                       (thresholds.current.idle - thresholds.current.pointing);
      } else if (clampedProgress >= thresholds.current.thanking) {
        newStage = AnimationStage.THANKING;
        stageProgress = (clampedProgress - thresholds.current.thanking) / 
                       (thresholds.current.pointing - thresholds.current.thanking);
      } else if (clampedProgress >= thresholds.current.outOfScreen) {
        newStage = AnimationStage.OUT_OF_SCREEN;
        stageProgress = (clampedProgress - thresholds.current.outOfScreen) / 
                       (thresholds.current.thanking - thresholds.current.outOfScreen);
      } else if (clampedProgress >= thresholds.current.jumping) {
        newStage = AnimationStage.JUMPING;
        stageProgress = (clampedProgress - thresholds.current.jumping) / 
                       (thresholds.current.outOfScreen - thresholds.current.jumping);
      } else if (clampedProgress >= thresholds.current.turning) {
        newStage = AnimationStage.TURNING;
        stageProgress = (clampedProgress - thresholds.current.turning) / 
                       (thresholds.current.jumping - thresholds.current.turning);
      } else {
        stageProgress = clampedProgress / thresholds.current.turning;
      }
      
      // Clamp stage progress to 0-1 range
      stageProgress = Math.max(0, Math.min(1, stageProgress));
      
      // Update state if changed
      if (newStage !== stage || stageProgress !== progress) {
        setStage(newStage);
        setProgress(stageProgress);
        
        // Notify parent component
        onChange(newStage, stageProgress);
      }
    };
    
    // Find the scroll trigger element
    triggerRef.current = document.querySelector(scrollTriggerElement);
    
    // Set up scroll listener
    window.addEventListener('scroll', calculateScrollProgress);
    
    // Calculate initial position
    calculateScrollProgress();
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', calculateScrollProgress);
    };
  }, [onChange, scrollTriggerElement, startOffset, animationDuration, stage, progress]);
  
  // No visible UI - this is a controller component
  return null;
};

export default ScrollAnimationController;