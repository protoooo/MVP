'use client'
import { useEffect, useRef } from 'react'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    let renderer, scene, camera, particles, geometry
    let animationFrameId
    let mouseX = 0
    let mouseY = 0
    let targetRotationX = 0
    let targetRotationY = 0
    
    // Variables for the breathing animation
    let time = 0

    const init = async () => {
      if (!window.THREE) {
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
          script.async = true
          script.onload = resolve
          document.body.appendChild(script)
        })
      }

      const THREE = window.THREE

      // 1. Scene Setup
      const width = window.innerWidth
      const height = window.innerHeight
      
      scene = new THREE.Scene()
      scene.background = new THREE.Color(0xffffff) 

      camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000)
      camera.position.z = 2.2 // Closer camera for more impact
      camera.position.x = -0.5 // Offset to leave space for text

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }) // Antialias = High Quality edges
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Retina support
      
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(renderer.domElement)
      }

      // 2. High Density Particle System
      geometry = new THREE.BufferGeometry()
      const count = 7500 // Increased density
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const originalPositions = new Float32Array(count * 3) // Store original positions for pulsing

      const color1 = new THREE.Color(0x1d4ed8) // Deep Blue
      const color2 = new THREE.Color(0x93c5fd) // Light Blue

      for (let i = 0; i < count; i++) {
        // Fibonacci Sphere Distribution (Perfectly even spacing)
        const phi = Math.acos(-1 + (2 * i) / count)
        const theta = Math.sqrt(count * Math.PI) * phi

        const r = 1.6

        const x = r * Math.cos(theta) * Math.sin(phi)
        const y = r * Math.sin(theta) * Math.sin(phi)
        const z = r * Math.cos(phi)

        positions[i * 3] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z
        
        // Save original for animation reference
        originalPositions[i * 3] = x
        originalPositions[i * 3 + 1] = y
        originalPositions[i * 3 + 2] = z

        // Gradient Logic
        const mixedColor = color1.clone().lerp(color2, (y + r) / (2 * r))
        colors[i * 3] = mixedColor.r
        colors[i * 3 + 1] = mixedColor.g
        colors[i * 3 + 2] = mixedColor.b
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

      const material = new THREE.PointsMaterial({
        size: 0.008, // Fine, high-res dots
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
      })

      particles = new THREE.Points(geometry, material)
      scene.add(particles)

      // 3. Interaction
      const onDocumentMouseMove = (event) => {
        mouseX = (event.clientX - width / 2) * 0.0005
        mouseY = (event.clientY - height / 2) * 0.0005
      }
      document.addEventListener('mousemove', onDocumentMouseMove)

      // 4. Animation Loop
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate)
        time += 0.01

        if (particles) {
          // Smooth Mouse Parallax
          targetRotationX = mouseX * 0.5
          targetRotationY = mouseY * 0.5
          
          particles.rotation.y += 0.001 // Constant spin
          particles.rotation.y += 0.05 * (targetRotationX - particles.rotation.y)
          particles.rotation.x += 0.05 * (targetRotationY - particles.rotation.x)

          // "Breathing" / "Liquid" Effect
          const positions = particles.geometry.attributes.position.array
          for(let i = 0; i < count; i++) {
             // Calculate a wave based on Y position and Time
             const wave = Math.sin(time + originalPositions[i * 3 + 1] * 2) * 0.02
             
             // Expand/Contract the sphere slightly based on the wave
             positions[i * 3] = originalPositions[i * 3] * (1 + wave)
             positions[i * 3 + 1] = originalPositions[i * 3 + 1] * (1 + wave)
             positions[i * 3 + 2] = originalPositions[i * 3 + 2] * (1 + wave)
          }
          particles.geometry.attributes.position.needsUpdate = true
        }

        renderer.render(scene, camera)
      }
      animate()

      // Handle Resize
      window.addEventListener('resize', onWindowResize, false)
    }

    const onWindowResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      }
    }

    init()

    return () => {
      window.removeEventListener('resize', onWindowResize)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 1, transition: 'opacity 1s ease-in-out' }} 
    />
  )
}
