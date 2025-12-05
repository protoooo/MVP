'use client'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

function ParticleGlobe(props) {
  const ref = useRef()
  
  // INCREASED DENSITY: 12,000 particles for that solid "Hyround" look
  const particles = useMemo(() => {
    const count = 12000 
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const originalPositions = new Float32Array(count * 3)
    
    // VIBRANT COLORS: Electric Blue to Deep Indigo
    const color1 = new THREE.Color('#2563eb') // Bright Blue
    const color2 = new THREE.Color('#1e40af') // Deep Blue

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count)
      const theta = Math.sqrt(count * Math.PI) * phi
      
      // BIGGER RADIUS: 3.5 fills the screen
      const r = 3.5 

      const x = r * Math.cos(theta) * Math.sin(phi)
      const y = r * Math.sin(theta) * Math.sin(phi)
      const z = r * Math.cos(phi)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      
      originalPositions[i * 3] = x
      originalPositions[i * 3 + 1] = y
      originalPositions[i * 3 + 2] = z

      const mixedColor = color1.clone().lerp(color2, (y + r) / (2 * r))
      colors[i * 3] = mixedColor.r
      colors[i * 3 + 1] = mixedColor.g
      colors[i * 3 + 2] = mixedColor.b
    }
    return { positions, colors, originalPositions }
  }, [])

  useFrame((state) => {
    const { clock, pointer } = state
    const time = clock.getElapsedTime()

    // Gentle Rotation
    ref.current.rotation.y = time * 0.05
    
    // Mouse Parallax
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, pointer.y * 0.05, 0.1)
    ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, pointer.x * 0.05, 0.1)

    // "Breathing" Wave Effect
    const positions = ref.current.geometry.attributes.position.array
    const originals = particles.originalPositions
    
    for(let i = 0; i < 12000; i++) {
        const wave = Math.sin(time * 0.5 + originals[i * 3 + 1] * 0.5) * 0.1
        const scale = 1 + wave

        positions[i * 3] = originals[i * 3] * scale
        positions[i * 3 + 1] = originals[i * 3 + 1] * scale
        positions[i * 3 + 2] = originals[i * 3 + 2] * scale
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group rotation={[0, 0, Math.PI / 4]} position={[0, -1, 0]}> {/* Shifted DOWN so it sits behind cards */}
      <Points ref={ref} positions={particles.positions} colors={particles.colors} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          vertexColors
          size={0.025}        // BIGGER DOTS for visibility
          sizeAttenuation={true}
          depthWrite={false}
          opacity={1}         // Full opacity
        />
      </Points>
    </group>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }} // Camera further back to see the massive globe
        dpr={[1, 2]} 
        gl={{ antialias: true, alpha: true }}
      >
        <ParticleGlobe />
      </Canvas>
    </div>
  )
}
