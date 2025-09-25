import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MathUtils, Vector3, Color } from 'three';
import * as THREE from 'three';

// Enhanced vertex shader for more obvious blob
const vertexShader = `
uniform float u_intensity;
uniform float u_time;

varying vec2 vUv;
varying float vDisplacement;

// Enhanced noise function
float noise(vec3 p) {
    return sin(p.x * 2.0) * sin(p.y * 2.0) * sin(p.z * 2.0) + 
           sin(p.x * 4.0) * sin(p.y * 4.0) * sin(p.z * 4.0) * 0.5;
}

void main() {
    vUv = uv;
    
    // More pronounced displacement
    vDisplacement = noise(position + vec3(u_time * 0.8));
    
    vec3 newPosition = position + normal * (u_intensity * vDisplacement * 0.3);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

// Enhanced fragment shader with glow effect
const fragmentShader = `
uniform float u_intensity;
uniform float u_time;
uniform vec3 u_color;
uniform float u_glowIntensity;

varying vec2 vUv;
varying float vDisplacement;

void main() {
    // Base alpha with displacement
    float baseAlpha = 0.3 + (vDisplacement * 0.2);
    
    // Glow effect when voice is detected
    float glowAlpha = u_glowIntensity * (0.4 + vDisplacement * 0.3);
    
    // Combine base and glow
    float finalAlpha = baseAlpha + glowAlpha;
    
    // Enhanced color with red glow
    vec3 baseColor = mix(u_color, vec3(1.0, 0.3, 0.3), vDisplacement * 0.5);
    vec3 glowColor = mix(baseColor, vec3(1.0, 0.2, 0.2), u_glowIntensity * 0.8);
    
    // Add red rim lighting effect for glow
    float rim = 1.0 - abs(vDisplacement);
    vec3 rimColor = mix(glowColor, vec3(1.0, 0.1, 0.1), rim * u_glowIntensity * 0.6);
    
    gl_FragColor = vec4(rimColor, finalAlpha);
}
`;

interface BlobProps {
  isVoiceDetected: boolean;
}

const Blob: React.FC<BlobProps> = ({ isVoiceDetected }) => {
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_intensity: { value: 0.4 },
      u_color: { value: new Color(0xdc2626) }, // Red theme color
      u_glowIntensity: { value: 0 }, // Glow intensity (0-1)
    }),
    []
  );

  useFrame((state) => {
    if (mesh.current) {
      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniforms.u_time.value = state.clock.getElapsedTime();
      
      // Smooth glow intensity easing
      const currentGlow = material.uniforms.u_glowIntensity.value;
      const targetGlow = isVoiceDetected ? 1.0 : 0.0;
      const newGlow = MathUtils.lerp(currentGlow, targetGlow, 0.15);
      material.uniforms.u_glowIntensity.value = newGlow;
      
      // Base rotation
      mesh.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.2;
      mesh.current.rotation.y = state.clock.getElapsedTime() * 0.1;
      mesh.current.rotation.z = Math.cos(state.clock.getElapsedTime() * 0.2) * 0.1;
      
      // Voice detection animation - rotation and scale only (no position changes)
      if (isVoiceDetected) {
        const voiceIntensity = Math.sin(state.clock.getElapsedTime() * 8) * 0.3;
        mesh.current.rotation.x += voiceIntensity;
        mesh.current.rotation.y += voiceIntensity * 0.5;
        mesh.current.rotation.z += voiceIntensity * 0.3;
        
        // Smooth scale pulsing effect with easing
        const time = state.clock.getElapsedTime() * 4;
        const scalePulse = 1 + Math.sin(time) * 0.15 + Math.sin(time * 2) * 0.05;
        mesh.current.scale.setScalar(0.6 * scalePulse);
        
        // Keep position fixed at center - no wobble
        mesh.current.position.set(0, 0, 0);
      } else {
        // Smooth transition back to normal scale
        const currentScale = mesh.current.scale.x;
        const targetScale = 0.6;
        const newScale = MathUtils.lerp(currentScale, targetScale, 0.1);
        mesh.current.scale.setScalar(newScale);
        
        // Keep position fixed at center
        mesh.current.position.set(0, 0, 0);
      }
    }
  });

  return (
    <mesh ref={mesh} scale={0.6} position={[0, 0, 0]}>
      <icosahedronGeometry args={[1, 12]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

interface BlobBackgroundProps {
  width: number;
  height: number;
  isVisible: boolean;
  isVoiceDetected: boolean;
}

const BlobBackground: React.FC<BlobBackgroundProps> = ({ width, height, isVisible, isVoiceDetected }) => {
  return (
    <div 
      style={{
        position: 'absolute',
        top: '60px',
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: isVoiceDetected ? 100 : (isVisible ? 1 : 0),
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: isVisible ? (isVoiceDetected ? 1 : 0.3) : 0,
        animation: isVisible ? 'blobScaleIn 0.5s ease-out' : 'blobScaleOut 0.3s ease-in',
        transformOrigin: 'center center',
        transition: 'opacity 0.3s ease-in-out, z-index 0.3s ease-in-out',
      }}
    >
      <Canvas
        camera={{ 
          position: [0, -1, 4], 
          fov: 50 
        }}
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'transparent'
        }}
      >
        <Blob isVoiceDetected={isVoiceDetected} />
      </Canvas>
    </div>
  );
};

export default BlobBackground;
