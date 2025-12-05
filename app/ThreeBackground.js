'use client'
import { Canvas } from '@react-three/fiber'
import { MeshDistortMaterial, Sphere, Float, Environment } from '@react-three/drei'

function MorphingBlob({ position, color, speed, distort, scale }) {
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere args={[1, 64, 64]} position={position} scale={scale}>
        <MeshDistortMaterial
          color={color}
          envMapIntensity={0.4}
          clearcoat={1}          // Makes it look like polished plastic/liquid
          clearcoatRoughness={0} // Smooth reflection
          metalness={0.1}
          roughness={0.2}        // Slight matte finish so it's not too shiny
          distort={distort}      // The amount of "wobble"
          speed={speed}          // How fast it morphs
        />
      </Sphere>
    </Float>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 45 }}>
        
        {/* 1. Lighting (Critical for the "3D" look) */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <directionalLight position={[-10, -10, -5]} intensity={1} color="#b0b0b0" />
        
        {/* Studio Lighting Environment for reflections */}
        <Environment preset="city" />

        {/* 2. The Fluid Shapes */}
        <group position={[0, 0, 0]}>
          
          {/* Left Blob (Behind Visual Inspection) - Cool Emerald/Blue mix */}
          <MorphingBlob 
            position={[-2.5, 0, -2]} 
            scale={2.2} 
            color="#a5f3fc" // Cyan/Light Blue
            distort={0.5} 
            speed={2} 
          />

          {/* Right Blob (Behind Regulatory Consultant) - Deep Royal Blue */}
          <MorphingBlob 
            position={[2.5, -0.5, -2]} 
            scale={2.4} 
            color="#e0e7ff" // Very light indigo/white
            distort={0.4} 
            speed={1.5} 
          />
          
          {/* Center Deep Accent - Adds depth in the middle */}
          <MorphingBlob 
            position={[0, 1, -5]} 
            scale={1.8} 
            color="#2563eb" // Protocol Blue
            distort={0.6} 
            speed={3} 
          />

        </group>
      </Canvas>
    </div>
  )
}
