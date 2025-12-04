'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. SETUP (Apple/Clean Vibe)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf4f4f5) // Very light grey (Zinc-100) match

    // ISOMETRIC CAMERA (Like the Room example you liked)
    const aspect = window.innerWidth / window.innerHeight
    const d = 20
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000)
    
    // Isometric angle
    camera.position.set(20, 20, 20) 
    camera.lookAt(scene.position)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true // Enable shadows for "baked" look
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)

    // 2. LIGHTING (The "Baked" Look)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    scene.add(dirLight)

    // 3. OBJECTS (Porcelain/Clay Material)
    // Matches "Food Service" cleanliness + Modern Tech
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.2,  // Slightly polished
      metalness: 0.1,  // Mostly plastic/ceramic
      clearcoat: 0.3,  // Glossy coating
      clearcoatRoughness: 0.1
    })

    // Create abstract floating shapes (ProtocolLM Colors)
    const shapes = []

    // Helper to add shapes
    const addShape = (geometry, color, x, y, z, scale) => {
      const mat = material.clone()
      mat.color.setHex(color)
      const mesh = new THREE.Mesh(geometry, mat)
      mesh.position.set(x, y, z)
      mesh.scale.set(scale, scale, scale)
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
      shapes.push({ mesh, speed: Math.random() * 0.002 + 0.001, offset: Math.random() * Math.PI })
    }

    // Geometries
    const torusGeo = new THREE.TorusGeometry(10, 3, 16, 100)
    const sphereGeo = new THREE.SphereGeometry(1, 32, 32)
    const icosaGeo = new THREE.IcosahedronGeometry(1, 0)

    // --- PLACING SHAPES ---
    // Big Green Ring (Safety)
    addShape(torusGeo, 0x10b981, 0, 0, 0, 1) 
    
    // Floating Orbs (Orange/Blue/Purple)
    addShape(sphereGeo, 0xf97316, 8, 5, 8, 3)   // Orange
    addShape(sphereGeo, 0x3b82f6, -8, -5, -5, 2.5) // Blue
    addShape(icosaGeo, 0x9333ea, -10, 8, 5, 2)  // Purple
    addShape(icosaGeo, 0x000000, 12, -8, 2, 1.5) // Black Accent

    // 4. ANIMATION LOOP
    const animate = () => {
      requestAnimationFrame(animate)
      
      const time = Date.now() * 0.001

      shapes.forEach((item, i) => {
        // Bobbing motion
        item.mesh.position.y += Math.sin(time + item.offset) * 0.02
        // Slow rotation
        item.mesh.rotation.x += item.speed
        item.mesh.rotation.y += item.speed
      })

      // Gentle camera sway
      camera.zoom = 1 + Math.sin(time * 0.1) * 0.05
      camera.updateProjectionMatrix()

      renderer.render(scene, camera)
    }
    animate()

    // 5. RESIZE
    const handleResize = () => {
      const aspect = window.innerWidth / window.innerHeight
      camera.left = -d * aspect
      camera.right = d * aspect
      camera.top = d
      camera.bottom = -d
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      // No blur, crisp 3D look
      style={{ opacity: 1 }} 
    />
  )
}
