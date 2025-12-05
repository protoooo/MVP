'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, PerspectiveCamera, Environment, Lightformer, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { useRef } from 'react'

function LiquidMercury({ position, scale }) {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere args={[1, 256, 256]} position={position} scale={scale}>
        <MeshDistortMaterial
          color="#ffffff"       // White base allows pure reflection
          roughness={0}         // 0 = Perfect Mirror
          metalness={1}         // 1 = Pure Metal
          distort={0.5}         // Heavy liquid movement
          speed={2}             // Fast fluidity
          radius={1}
          clearcoat={1}         // Extra glossy layer
          clearcoatRoughness={0}
          envMapIntensity={2}   // Make reflections bright
        />
      </Sphere>
    </Float>
  )
}

function StudioEnvironment() {
  // Chrome looks flat without things to reflect. 
  // We build a virtual light studio around the object to create "Glossy Stripes".
  return (
    <Environment resolution={512}>
      {/* 1. Main Highlight (Top) */}
      <Lightformer 
        intensity={4} 
        rotation-x={Math.PI / 2} 
        position={[0, 5, -9]} 
        scale={[10, 10, 1]} 
      />
      {/* 2. Side Lights (To create edges) */}
      <Lightformer 
        intensity={2} 
        rotation-y={Math.PI / 2} 
        position={[-5, 1, -1]} 
        scale={[20, 0.1, 1]} 
        color="#22D3EE" // Cyan reflection
      />
      <Lightformer 
        intensity={2} 
        rotation-y={Math.PI / 2} 
        position={[-5, -1, -1]} 
        scale={[20, 0.5, 1]} 
        color="#ffffff" // White reflection
      />
      {/* 3. Contrast Strips (To make it look metallic, not just white) */}
      <Lightformer 
        intensity={0.5} 
        rotation-y={-Math.PI / 2} 
        position={[10, 1, 0]} 
        scale={[20, 1, 1]} 
        color="black" 
      />
    </Environment>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-white pointer-events-none">
      <Canvas dpr={[1, 2]}> {/* dpr=2 ensures sharp edges on retina screens */}
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
        
        <StudioEnvironment />
        
        <group position={[0, 0, -2]}>
          {/* Main Mercury Blob */}
          <LiquidMercury position={[3, -1, -2]} scale={2.5} />
          
          {/* Smaller accented blob behind */}
          <LiquidMercury position={[-3, 2, -5]} scale={1.8} />
        </group>
      </Canvas>
    </div>
  )
}
