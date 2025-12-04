'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. SETUP
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const renderer = new THREE.WebGLRenderer({ alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // 2. THE SHADER (The "Liquid" Engine)
    // This tells the GPU exactly how to mix the colors per pixel
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: { x: window.innerWidth, y: window.innerHeight } },
      // YOUR BRAND COLORS (Converted to RGB 0.0-1.0 format)
      colorA: { value: new THREE.Vector3(0.98, 0.45, 0.08) }, // Orange
      colorB: { value: new THREE.Vector3(0.58, 0.20, 0.92) }, // Purple
      colorC: { value: new THREE.Vector3(0.11, 0.44, 1.00) }, // Blue Accent
    }

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `

    // This creates the flowing "lava lamp" effect
    const fragmentShader = `
      uniform float u_time;
      uniform vec3 colorA;
      uniform vec3 colorB;
      uniform vec3 colorC;
      varying vec2 vUv;

      void main() {
        // Create a moving coordinate system
        vec2 uv = vUv;
        
        // Warping the coordinates (This creates the fluid shape)
        // We add sine waves to X and Y based on Time
        float wave1 = sin(uv.x * 3.0 + u_time * 0.5);
        float wave2 = cos(uv.y * 5.0 + u_time * 0.3);
        float wave3 = sin((uv.x + uv.y) * 4.0 - u_time * 0.4);
        
        // Combine waves to get a mixing factor (0.0 to 1.0)
        float mixFactor = (wave1 + wave2 + wave3) / 3.0;
        
        // Normalize mixFactor to 0.0 - 1.0 range
        mixFactor = mixFactor * 0.5 + 0.5;

        // Mix the colors based on the warping
        vec3 finalColor = mix(colorA, colorB, mixFactor);
        
        // Add the third color (Blue) in the deep valleys of the waves
        float secondaryMix = sin(u_time * 0.2 + uv.y * 10.0);
        finalColor = mix(finalColor, colorC, smoothstep(0.6, 1.0, secondaryMix * mixFactor));

        // Soften it slightly with white (tint) so it's not too dark
        finalColor = mix(finalColor, vec3(1.0), 0.2);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    // 3. CREATE MESH
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // 4. ANIMATION LOOP
    const animate = (time) => {
      // Update time uniform
      material.uniforms.u_time.value = time * 0.001 // Convert ms to seconds
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)

    // 5. RESIZE
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      material.uniforms.u_resolution.value.x = window.innerWidth
      material.uniforms.u_resolution.value.y = window.innerHeight
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
      // We keep a small blur to hide any digital harshness, but much less than before
      style={{ opacity: 0.6 }} 
    />
  )
}
