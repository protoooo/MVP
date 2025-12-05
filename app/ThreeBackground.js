'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useRef } from 'react'

function DataRibbon({ color, position, rotation, scale, speed, opacity }) {
  const ref = useRef()
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    ref.current.position.y = position[1] + Math.sin(t * speed) * 0.5
    ref.current.rotation.x = Math.sin(t * speed * 0.5) * 0.1
    ref.current.distort = 0.4 + Math.sin(t * 2) * 0.1
  })

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={ref} position={position} rotation={rotation} scale={scale}>
        <tubeGeometry args={[
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-10, 0, 0),
            new THREE.Vector3(-5, 2, 0),
            new THREE.Vector3(5, -2, 0),
            new THREE.Vector3(10, 0, 0)
          ]), 64, 0.4, 16, false
        ]} />
        <MeshDistortMaterial 
          color={color} speed={2} distort={0.4} radius={1}
          transparent opacity={opacity} roughness={0.1} metalness={0.1}
        />
      </mesh>
    </Float>
  )
}

function RibbonScene() {
  return (
    <group position={[0, 0, -5]} rotation={[0, 0, -0.1]}>
      <DataRibbon color="#1E293B" position={[0, 0, -2]} rotation={[0, 0, 0]} scale={[1.5, 1.5, 1.5]} speed={0.5} opacity={1} />
      <DataRibbon color="#06B6D4" position={[0, 1.5, -1]} rotation={[0, 0, 0.1]} scale={[1.2, 1.2, 1.2]} speed={0.7} opacity={0.9} />
      <DataRibbon color="#94A3B8" position={[0, -2, -4]} rotation={[0, 0, -0.1]} scale={[1.8, 1.8, 1.8]} speed={0.3} opacity={0.3} />
    </group>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-white pointer-events-none">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={45} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={1} color="#E0F2FE" />
        <RibbonScene />
        <fog attach="fog" args={['#ffffff', 5, 25]} />
      </Canvas>
    </div>
  )
}
