'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. SETUP
    const scene = new THREE.Scene()
    // Matches the page background exactly for seamless blending
    scene.background = new THREE.Color(0xFAFAFA) 
    // Add some fog to blend distant objects into the background
    scene.fog = new THREE.Fog(0xFAFAFA, 15, 30)

    // ISOMETRIC CAMERA SETUP
    // Orthographic is crucial for that "Architectural" look
    const aspect = window.innerWidth / window.innerHeight
    const d = 18
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000)
    
    // The "True Isometric" Angle
    camera.position.set(20, 20, 20) 
    camera.lookAt(scene.position)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    // Enable Shadows for depth
    renderer.shadowMap.enabled = true 
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    containerRef.current.appendChild(renderer.domElement)

    // 2. LIGHTING (Studio Setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
    dirLight.position.set(10, 20, 5)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048 // High res shadows
    dirLight.shadow.mapSize.height = 2048
    scene.add(dirLight)

    // 3. MATERIALS (The "Porcelain" Look)
    // Base White Ceramic
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1
    })

    // Accent Materials (Your Brand Palette)
    const mintMat = new THREE.MeshPhysicalMaterial({
      color: 0x67C090, // Fresh Green
      roughness: 0.2,
      metalness: 0.1
    })

    const blueMat = new THREE.MeshPhysicalMaterial({
      color: 0x26667F, // Matte Mid Blue
      roughness: 0.2,
      metalness: 0.1
    })

    const deepMat = new THREE.MeshPhysicalMaterial({
      color: 0x124170, // Deep Navy
      roughness: 0.2,
      metalness: 0.1
    })

    // 4. BUILD THE "FACILITY"
    // We create abstract shapes that hint at walls, counters, and pipes
    const group = new THREE.Group()
    
    const addBlock = (w, h, d, x, z, mat = baseMat) => {
      const geo = new THREE.BoxGeometry(w, h, d)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, h/2, z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
      return mesh
    }

    // Floor Grid (Subtle)
    const gridHelper = new THREE.GridHelper(40, 40, 0xe5e7eb, 0xe5e7eb)
    scene.add(gridHelper)

    // --- ABSTRACT KITCHEN LAYOUT ---
    
    // Back Wall Structure
    addBlock(2, 6, 2, -8, -8, deepMat)
    addBlock(10, 4, 1, -2, -8, baseMat)
    
    // "Work Stations" (Counters)
    addBlock(4, 1.5, 3, 0, 0, baseMat)
    addBlock(4, 1.5, 3, 6, 0, baseMat)
    
    // "Pipes/Vents" (Floating Cylinders)
    const pipeGeo = new THREE.CylinderGeometry(0.3, 0.3, 15, 16)
    const pipe = new THREE.Mesh(pipeGeo, blueMat)
    pipe.rotation.z = Math.PI / 2
    pipe.position.set(0, 5, -6)
    group.add(pipe)

    // "Compliance Nodes" (Floating Spheres/Icons)
    const spheres = []
    const addFloatingNode = (color, x, y, z, scale) => {
      const geo = new THREE.IcosahedronGeometry(0.6, 0)
      const mat = color === 'mint' ? mintMat : (color === 'blue' ? blueMat : deepMat)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z)
      mesh.scale.set(scale, scale, scale)
      mesh.castShadow = true
      group.add(mesh)
      
      // Add a ring around it
      const ringGeo = new THREE.TorusGeometry(1.0, 0.05, 8, 32)
      const ring = new THREE.Mesh(ringGeo, baseMat)
      ring.rotation.x = Math.PI / 2
      mesh.add(ring)

      spheres.push({ mesh, yBase: y, offset: Math.random() * Math.PI })
    }

    addFloatingNode('mint', 0, 3, 0, 1)   // Above counter 1
    addFloatingNode('blue', 6, 3, 0, 1)   // Above counter 2
    addFloatingNode('deep', -5, 4, 5, 0.8) // Foreground

    scene.add(group)

    // 5. ANIMATION LOOP
    const animate = () => {
      requestAnimationFrame(animate)
      const time = Date.now() * 0.001

      // Gentle floating for the nodes
      spheres.forEach(obj => {
        obj.mesh.position.y = obj.yBase + Math.sin(time + obj.offset) * 0.3
        obj.mesh.rotation.y += 0.01
        obj.mesh.rotation.z += 0.005
      })

      // Very slow rotation of the entire facility to show depth
      // group.rotation.y = Math.sin(time * 0.05) * 0.05

      renderer.render(scene, camera)
    }
    animate()

    // 6. RESIZE
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
      // Position it so the white space is top-left (for text) and model is bottom-right
      style={{ opacity: 1.0 }} 
    />
  )
}
