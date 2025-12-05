'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, PerspectiveCamera, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useRef } from 'react'

function MatteRibbon({ color, points, width, speed, metallic, roughness }) {
  const ref = useRef()
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    // Very slow, majestic movement. No jitters.
    ref.current.position.y = Math.sin(t * speed) * 0.3
    ref.current.rotation.x = Math.sin(t * speed * 0.5) * 0.05
  })

  // Create smooth curve from points
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
      <mesh ref={ref} position={[0, 0, 0]}>
        {/* 
           1024 Segments = Ultra Smooth (Retina quality)
           No more "chopped" lines.
        */}
        <tubeGeometry args={[curve, 1024, width, 64, false]} />
        
        {/* 
           THE "CLAUDE" MATERIAL: 
           High Roughness = Matte/Clay/Brushed finish.
           Moderate Metalness = Catches light but doesn't mirror.
        */}
        <meshStandardMaterial 
          color={color}
          roughness={roughness} 
          metalness={metallic}
          flatShading={false}
        />
      </mesh>
    </Float>
  )
}

function Composition() {
  return (
    <group position={[0, 0, -5]} rotation={[0, 0, -0.1]}>
      
      {/* 1. THE "MATTE CHROME" (Brushed Silver) */}
      {/* It sits in the back, acting as the foundation */}
      <MatteRibbon 
        color="#E2E8F0" // Cool Silver/Slate-200
        width={1.5}
        speed={0.3}
        metallic={0.6} // Semi-metallic
        roughness={0.4} // Brushed finish, not glossy
        points={[
          [-15, 0, -2],
          [-7, 3, -2],
          [0, -2, -2],
          [7, 3, -2],
          [15, -1, -2]
        ]}
      />

      {/* 2. THE "PROTOCOL BLUE" (Soft Matte Plastic) */}
      {/* It weaves through the silver one */}
      <MatteRibbon 
        color="#3B82F6" // Blue-500
        width={0.8}
        speed={0.4}
        metallic={0.1} // Mostly plastic/organic
        roughness={0.7} // Very matte, soft touch
        points={[
          [-15, -2, 0],
          [-6, 1, 1],
          [2, 2, 1],
          [8, -2, 1],
          [15, 2, 0]
        ]}
      />
    </group>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-white pointer-events-none">
      <Canvas dpr={[1, 2]}> {/* High DPI for iPad sharpness */}
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={35} />
        
        {/* 
           LIGHTING: The key to the "Matte" look.
           We use a soft "Studio" environment map + gentle directional lights.
        */}
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 10, 5]} intensity={2} color="#ffffff" />
        <directionalLight position={[-10, 0, 5]} intensity={1} color="#E0F2FE" />
        
        {/* "City" preset provides nice white reflections for the matte metal */}
        <Environment preset="city" blur={1} /> 

        <Composition />
        
        {/* Subtle white fog to feather the edges into the background */}
        <fog attach="fog" args={['#ffffff', 5, 40]} />
      </Canvas>
    </div>
  )
}
