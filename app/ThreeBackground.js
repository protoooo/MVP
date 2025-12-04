'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. SETUP
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff) // White base

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 100 // Move camera back

    const renderer = new THREE.WebGLRenderer({ alpha: true }) // Alpha allows transparency
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // 2. CREATE THE MESH (The shape)
    // 150x150 size, 64x64 segments (higher = smoother waves)
    const geometry = new THREE.PlaneGeometry(150, 150, 64, 64) 
    
    // 3. COLOR THE MESH (Your Brand Colors)
    const count = geometry.attributes.position.count
    const colors = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      const x = geometry.attributes.position.getX(i)
      
      let r, g, b
      // Logic: Mix Orange (#f97316) and Purple (#9333ea) based on position
      if (x < -20) {
        // Orange side
        r = 0.98; g = 0.45; b = 0.08
      } else if (x > 20) {
        // Purple side
        r = 0.58; g = 0.20; b = 0.92
      } else {
        // Middle mix
        r = 0.95; g = 0.90; b = 0.95
      }
      
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // 4. ANIMATION LOOP
    let time = 0
    // Save original flat positions
    const originalPositions = geometry.attributes.position.array.slice()

    const animate = () => {
      time += 0.003 // Speed
      
      const positions = geometry.attributes.position.array
      
      for (let i = 0; i < count; i++) {
        const x = originalPositions[i * 3]
        const y = originalPositions[i * 3 + 1]
        
        // WAVE MATH: This creates the "liquid" movement
        const z = 
          Math.sin(x * 0.04 + time) * 10 + 
          Math.cos(y * 0.03 + time) * 10 +
          Math.sin(x * 0.1 + y * 0.1 + time) * 5

        positions[i * 3 + 2] = z
      }
      
      geometry.attributes.position.needsUpdate = true
      
      // Slow rotation
      mesh.rotation.z = Math.sin(time * 0.1) * 0.1
      mesh.rotation.x = -0.2 // Tilt slightly back
      
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }

    animate()

    // 5. RESIZE HANDLER
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // Cleanup to prevent memory leaks
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      // THE SECRET SAUCE: High blur makes polygons look like fluid gradients
      style={{ filter: 'blur(80px)', opacity: 0.7 }} 
    />
  )
}
