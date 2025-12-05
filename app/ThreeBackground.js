'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, PerspectiveCamera, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useRef } from 'react'

function SatinRibbon({ color, points, width, speed, materialType }) {
  const ref = useRef()
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    // Slow, banking turn animation (like a ribbon floating in wind)
    ref.current.rotation.x = Math.sin(t * speed * 0.5) * 0.1
    ref.current.position.y = Math.sin(t * speed) * 0.2
  })

  const curve = new THREE.CatmullRomCurve3(
    points.map(p => new THREE.Vector3(...p)),
    false,
    'centripetal',
    0.5
  )

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
      <mesh ref={ref}>
        {/* 
           FLATTENED GEOMETRY
           The 'scale' prop [1, 0.05, 1] flattens the tube into a ribbon/tape.
           This looks much more modern/graphic design than a round pipe.
        */}
        <tubeGeometry args={[curve, 512, width, 16, false]} />
        <group scale={[1, 0.05, 1]}> 
           {/* 
              SATIN FINISH
              Roughness 0.4 + Metalness 0.5 = "Anodized Aluminum" or "Satin Paper"
              No mirror reflections. Soft highlights only.
           */}
           <meshStandardMaterial 
             color={color}
             roughness={0.4} 
             metalness={0.5}
             envMapIntensity={2}
             flatShading={false}
           />
        </group>
      </mesh>
    </Float>
  )
}

function Composition() {
  return (
    <group position={[0, 0, -5]} rotation={[0, 0, -0.1]}>
      
      {/* 1. The Satin Silver Ribbon (Background) */}
      <SatinRibbon 
        color="#cbd5e1" // Slate-300 (Darker silver for contrast)
        width={2}
        speed={0.2}
        points={[
          [-15, 2, -4],
          [-7, -2, -4],
          [0, 2, -4],
          [7, -2, -4],
          [15, 2, -4]
        ]}
      />

      {/* 2. The Protocol Blue Ribbon (Foreground) */}
      <SatinRibbon 
        color="#3B82F6" // Brand Blue
        width={1.2}
        speed={0.3}
        points={[
          [-15, -1, 0],
          [-6, 2, 1],
          [2, -1, 1],
          [9, 2, 1],
          [15, -1, 0]
        ]}
      />
    </group>
  )
}

export default function ThreeBackground() {
  return (
    // Changed bg to slate-50 (very light grey) to prove update works
    <div className="fixed inset-0 z-0 bg-slate-50 pointer-events-none">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={35} />
        
        {/* Broad, soft studio lighting (Softbox style) */}
        <ambientLight intensity={1.5} />
        <rectAreaLight width={20} height={20} color="#ffffff" intensity={2} position={[0, 10, 10]} lookAt={[0,0,0]} />
        <directionalLight position={[-10, 0, 5]} intensity={1} color="#E0F2FE" />
        
        <Environment preset="city" blur={1} /> 

        <Composition />
        
        {/* Fog matches the new Slate-50 background */}
        <fog attach="fog" args={['#f8fafc', 5, 40]} />
      </Canvas>
    </div>
  )
}
