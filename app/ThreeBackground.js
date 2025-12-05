'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { useRef } from 'react'

// A reusable component for a high-quality, matte ribbon
function SmoothRibbon({ color, points, width, speed, materialType }) {
  const ref = useRef()
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    // Elegant, slow floating. No warping.
    ref.current.position.y = Math.sin(t * speed) * 0.2
    ref.current.rotation.x = Math.cos(t * speed * 0.5) * 0.05
  })

  // CatmullRomCurve3 creates perfectly smooth, organic curves
  const curve = new THREE.CatmullRomCurve3(
    points.map(p => new THREE.Vector3(...p)),
    false, // Closed?
    'centripetal', // Curve type (smoothest)
    0.5 // Tension
  )

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
      <mesh ref={ref}>
        {/* 1024 segments ensures it looks like a vector line, not 3D geometry */}
        <tubeGeometry args={[curve, 1024, width, 64, false]} />
        
        {/* MATERIAL SWITCHER */}
        {materialType === 'clay' ? (
          // THE "NOTION BLUE" LOOK: Soft, matte, paper-like
          <meshStandardMaterial 
            color={color}
            roughness={0.7} 
            metalness={0.0}
          />
        ) : (
          // THE "MODERN CHROME" LOOK: Bead-blasted Aluminum (MacBook texture)
          // Reflects light softly, doesn't look like a mirror
          <meshStandardMaterial 
            color={color}
            roughness={0.5}
            metalness={0.8}
            envMapIntensity={1}
          />
        )}
      </mesh>
    </Float>
  )
}

function SceneComposition() {
  return (
    <group position={[0, 0, -5]} rotation={[0, 0, -0.1]}>
      
      {/* 1. The Matte Aluminum Backbone */}
      <SmoothRibbon 
        color="#F1F5F9" // Slate-100 (Very light grey/silver)
        materialType="aluminum"
        width={1.8}
        speed={0.2}
        points={[
          [-12, 0, -2],
          [-6, 3, -1],
          [0, -2, -2],
          [6, 3, -1],
          [12, 0, -2]
        ]}
      />

      {/* 2. The Matte Blue Accent */}
      <SmoothRibbon 
        color="#3B82F6" // Modern Blue
        materialType="clay"
        width={0.8}
        speed={0.3}
        points={[
          [-12, -2, 1],
          [-5, 1, 2],
          [2, 2, 2],
          [9, -2, 1],
          [15, 1, 0]
        ]}
      />
    </group>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-white pointer-events-none">
      <Canvas dpr={[1, 2]}> {/* High DPI for crispness */}
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={35} />
        
        {/* 
           LIGHTING IS KEY FOR MATTE LOOKS 
           We use broad, soft lights to avoid harsh plastic highlights.
        */}
        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
        {/* A cool blue fill light from the bottom adds the "Tech" feel without gloss */}
        <directionalLight position={[-10, -10, 5]} intensity={0.5} color="#DBEAFE" />
        
        {/* "City" environment gives the Aluminum something to reflect subtly */}
        <Environment preset="city" />

        <SceneComposition />
        
        {/* 
           CONTACT SHADOWS 
           This grounds the ribbons against the back wall, adding depth 
           without making them look 3D.
        */}
        <ContactShadows 
          opacity={0.3} 
          scale={30} 
          blur={2} 
          far={10} 
          resolution={256} 
          color="#000000" 
        />
        
        {/* Soft fog to gently fade the ends */}
        <fog attach="fog" args={['#ffffff', 5, 40]} />
      </Canvas>
    </div>
  )
}
