'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, PerspectiveCamera, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { useRef } from 'react'

function ChromeRibbon({ color, width, position, rotation, speed, distort, opacity }) {
  const ref = useRef()
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    // Ultra-smooth, heavy liquid movement
    ref.current.distort = distort + Math.sin(t * speed) * 0.1
  })

  // Create a long, elegant S-curve
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-15, 1, 0),
    new THREE.Vector3(-8, 3, 0), // Peak
    new THREE.Vector3(-2, -3, 0), // Valley
    new THREE.Vector3(5, 2, 0), // Peak
    new THREE.Vector3(15, -2, 0)
  ])

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5}>
      <mesh ref={ref} position={position} rotation={rotation}>
        {/* 
           High Resolution Geometry 
           512 segments (vs 64 before) removes the "chopped" look
        */}
        <tubeGeometry args={[curve, 512, width, 32, false]} />
        
        <MeshDistortMaterial 
          color={color}
          speed={speed} 
          distort={0.3} // Liquid wobbling
          radius={1}
          
          /* CHROME SETTINGS */
          metalness={1} 
          roughness={0.1} // Very shiny, slight blur for realism
          clearcoat={1}   // Automotive finish
          clearcoatRoughness={0}
          envMapIntensity={2} // Bright reflections
          
          /* Transparency settings */
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    </Float>
  )
}

function LightingRig() {
  // Chrome needs things to reflect to look real.
  // These invisible lights create the "glossy streaks" on the metal.
  return (
    <Environment resolution={512}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <Lightformer intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
        <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[10, 2, 1]} />
        <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[10, 2, 1]} />
        <Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 2, 1]} />
      </group>
    </Environment>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-white pointer-events-none">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={35} />
        
        <LightingRig />
        
        <group position={[0, -1, 0]}>
          {/* 1. The HERO Chrome Ribbon (Liquid Silver) */}
          <ChromeRibbon 
            color="#E2E8F0" // Silver/White
            width={1.2}
            position={[0, 0, -2]} 
            rotation={[0.2, 0, 0]}
            speed={1.5} 
            distort={0.4}
            opacity={1} 
          />

          {/* 2. The Cyan Glass Accent (Behind) */}
          <ChromeRibbon 
            color="#06B6D4" // Cyan
            width={0.8}
            position={[0, 1, -4]} 
            rotation={[0.3, 0, 0]}
            speed={2} 
            distort={0.5}
            opacity={1} 
          />
        </group>
        
        {/* Soft fog to merge the ribbons into the white void */}
        <fog attach="fog" args={['#ffffff', 5, 30]} />
      </Canvas>
    </div>
  )
}
