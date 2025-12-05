'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Line, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useRef, useMemo } from 'react'

function DataStream({ color, width, speed, curve, opacity }) {
  const lineRef = useRef()
  
  useFrame((state) => {
    if (lineRef.current) {
      lineRef.current.position.y = Math.sin(state.clock.elapsedTime * speed) * 0.2
      lineRef.current.rotation.z = Math.sin(state.clock.elapsedTime * (speed * 0.5)) * 0.05
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={lineRef}>
        <Line
          points={curve}
          color={color}
          lineWidth={width}
          transparent
          opacity={opacity}
        />
      </group>
    </Float>
  )
}

function StreamLines() {
  const curves = useMemo(() => {
    const lines = []
    const colors = ['#E2E8F0', '#CBD5E1', '#94A3B8', '#000000']
    
    for (let i = 0; i < 12; i++) {
      const points = []
      const width = 25
      for (let j = 0; j <= 20; j++) {
        const x = (j / 20) * width - (width / 2)
        const y = Math.sin(x * 0.5 + (i * 10)) * 2 + (Math.random() * 0.5)
        const z = -i * 1.5
        points.push(new THREE.Vector3(x, y, z))
      }
      
      const curve = new THREE.CatmullRomCurve3(points).getPoints(100)
      
      lines.push({
        curve,
        color: i === 5 ? '#000000' : colors[i % 3],
        width: i === 5 ? 3 : 8,
        speed: 0.2 + (Math.random() * 0.3),
        opacity: i === 5 ? 0.8 : 0.3
      })
    }
    return lines
  }, [])

  return (
    <group rotation={[0, 0, -0.2]} position={[0, 0, -5]}>
      {curves.map((props, i) => (
        <DataStream key={i} {...props} />
      ))}
    </group>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-white pointer-events-none">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
        <ambientLight intensity={1} />
        <StreamLines />
        <fog attach="fog" args={['#ffffff', 5, 25]} />
      </Canvas>
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
    </div>
  )
}
