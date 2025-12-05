'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Plane } from '@react-three/drei'
import * as THREE from 'three'
import { useRef } from 'react'

function TopographyGrid() {
  const meshRef = useRef()

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    // 1. Rotate the landscape slowly
    meshRef.current.rotation.z = t * 0.05
    
    // 2. Make it breathe (simulating data flow)
    // We access the position attribute of the geometry directly
    const { position } = meshRef.current.geometry.attributes
    
    // Simple gentle wave effect
    // Note: In a real production app we might use a vertex shader, 
    // but this is lighter and simpler for this specific look.
    meshRef.current.position.z = -10 + Math.sin(t * 0.2) * 0.5
  })

  return (
    <group rotation={[-Math.PI / 2.5, 0, 0]} position={[0, 4, -10]}>
      <Plane ref={meshRef} args={[50, 50, 64, 64]}>
        {/* 
           MeshStandardMaterial reacts to light. 
           We use 'wireframe' to get that clean blueprint look.
        */}
        <meshStandardMaterial 
          color="#ffffff" 
          wireframe={true}
          transparent={true}
          opacity={0.3} // Keep it subtle so text is readable
          roughness={0.5}
          metalness={0.8}
        />
      </Plane>
    </group>
  )
}

function DualityLighting() {
  return (
    <>
      {/* 1. VISUAL INSPECTION LIGHT (Left - Emerald/Teal) */}
      <spotLight 
        position={[-20, 0, 10]} 
        color="#10B981" 
        intensity={20} 
        angle={0.5} 
        penumbra={1} 
        distance={50} 
      />

      {/* 2. REGULATORY CONSULTANT LIGHT (Right - Blue/Indigo) */}
      <spotLight 
        position={[20, 0, 10]} 
        color="#3B82F6" 
        intensity={20} 
        angle={0.5} 
        penumbra={1} 
        distance={50} 
      />
      
      {/* 3. Base Fill Light (White - keeps lines visible) */}
      <ambientLight intensity={0.5} color="#e2e8f0" />
    </>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-white pointer-events-none">
      <Canvas dpr={[1, 2]}> {/* High DPI for sharp lines on iPad */}
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={60} />
        
        {/* The lights paint the colors onto the white grid */}
        <DualityLighting />
        
        {/* The moving structure */}
        <TopographyGrid />
        
        {/* Fog creates depth - the grid fades into the white background */}
        <fog attach="fog" args={['#ffffff', 5, 30]} />
      </Canvas>
    </div>
  )
}
