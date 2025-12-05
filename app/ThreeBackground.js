'use client'
import { useEffect, useRef } from 'react'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    let renderer, scene, camera, particles
    let animationFrameId

    const init = async () => {
      // 1. Load Three.js dynamically
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

      // 2. Setup Scene
      const width = window.innerWidth
      const height = window.innerHeight
      
      scene = new THREE.Scene()
      scene.background = new THREE.Color(0xffffff) // Pure White Background

      camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
      // Position camera to look at the globe
      camera.position.z = 2.5 
      // Move camera slightly left so the globe appears on the right
      camera.position.x = -0.8 

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(renderer.domElement)
      }

      // 3. Create the Particle Globe (Fibonacci Sphere)
      const geometry = new THREE.BufferGeometry()
      const count = 6000 // Number of dots (High density like Hyround)
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)

      const color1 = new THREE.Color(0x2563eb) // Dark Blue
      const color2 = new THREE.Color(0x60a5fa) // Light Blue

      for (let i = 0; i < count; i++) {
        // Fibonacci Sphere Algorithm for even distribution
        const phi = Math.acos(-1 + (2 * i) / count)
        const theta = Math.sqrt(count * Math.PI) * phi

        const r = 1.6 // Radius of the globe

        const x = r * Math.cos(theta) * Math.sin(phi)
        const y = r * Math.sin(theta) * Math.sin(phi)
        const z = r * Math.cos(phi)

        positions[i * 3] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z

        // Gradient coloring (top light, bottom dark)
        const mixedColor = color1.clone().lerp(color2, (y + r) / (2 * r))
        colors[i * 3] = mixedColor.r
        colors[i * 3 + 1] = mixedColor.g
        colors[i * 3 + 2] = mixedColor.b
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

      // Material settings for the dots
      const material = new THREE.PointsMaterial({
        size: 0.012, // Tiny dots
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
      })

      particles = new THREE.Points(geometry, material)
      scene.add(particles)

      // 4. Animation Loop
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate)
        
        // Rotate the globe
        if (particles) {
          particles.rotation.y += 0.0015 // Slow spin
          particles.rotation.x = 0.2 // Tilted axis
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
      style={{ opacity: 1 }} 
    />
  )
}
