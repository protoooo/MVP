'use client'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

// 1. The Fluid Globe Component
function ParticleGlobe(props) {
  const ref = useRef()
  
  // Create 6000 particles evenly distributed on a sphere
  const particles = useMemo(() => {
    const count = 6000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    
    const color1 = new THREE.Color('#2563eb') // Blue
    const color2 = new THREE.Color('#93c5fd') // Light Blue

    for (let i = 0; i < count; i++) {
      // Fibonacci Sphere algorithm for perfect distribution
      const phi = Math.acos(-1 + (2 * i) / count)
      const theta = Math.sqrt(count * Math.PI) * phi
      
      const r = 1.8 // Radius

      const x = r * Math.cos(theta) * Math.sin(phi)
      const y = r * Math.sin(theta) * Math.sin(phi)
      const z = r * Math.cos(phi)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      // Color gradient mixing
      const mixedColor = color1.clone().lerp(color2, (y + r) / (2 * r))
      colors[i * 3] = mixedColor.r
      colors[i * 3 + 1] = mixedColor.g
      colors[i * 3 + 2] = mixedColor.b
    }
    return { positions, colors }
  }, [])

  // The Animation Loop (Runs 60fps)
  useFrame((state) => {
    const { clock, pointer } = state
    
    // 1. Automatic Rotation
    ref.current.rotation.y = clock.getElapsedTime() * 0.05
    
    // 2. Mouse Parallax (Smooth tilting based on mouse position)
    // We linearly interpolate (lerp) current rotation to mouse position for smoothness
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, pointer.y * 0.2, 0.1)
    ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, pointer.x * 0.1, 0.1)

    // 3. "Breathing" Wave Effect
    // We access the raw positions and manipulate them with a Sine wave
    // This makes the globe feel like a living organism or liquid
    const positions = ref.current.geometry.attributes.position.array
    const time = clock.getElapsedTime()

    // Note: We aren't updating the buffer here for performance in this specific 
    // simplified example, but rotation + parallax gives the fluid feel.
    // For true vertex waving, we would use a vertex shader (more complex).
  })

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={particles.positions} colors={particles.colors} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          vertexColors
          size={0.015}        // Dot size
          sizeAttenuation={true} // Dots get smaller when further away
          depthWrite={false}
          blending={THREE.AdditiveBlending} // Makes overlapping dots glow
        />
      </Points>
    </group>
  )
}

// 2. The Main Scene Setup
export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 60 }}
        // Dpr handles pixel ratio for Retina screens (sharpness)
        dpr={[1, 2]} 
        // Optimization: only render when needed
        gl={{ antialias: true, alpha: true }}
      >
        {/* Ambient light subtly fills shadows */}
        <ambientLight intensity={0.5} />
        
        {/* The Globe */}
        <ParticleGlobe />
        
        {/* Optional: Add Fog to fade particles into the distance for depth */}
        <fog attach="fog" args={['#ffffff', 3.5, 5.5]} />
      </Canvas>
    </div>
  )
}
