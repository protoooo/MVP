'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. SETUP
    const scene = new THREE.Scene()
    // Apple Health style: Clean, clinical off-white background
    scene.background = new THREE.Color(0xfbfbfb) 

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // 2. SHADER CONFIG
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    }

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `

    // APPLE HEALTH / MINDFULNESS SHADER
    // Uses Soft Signed Distance Fields (SDFs) to create breathing, mixing colors
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      varying vec2 vUv;

      // Soft Glow Function
      float orb(vec2 uv, vec2 pos, float size) {
          float d = length(uv - pos);
          // Very soft smoothstep for that "diffused light" look
          return smoothstep(size, size * 0.2, d); 
      }

      void main() {
        // Fix aspect ratio
        vec2 uv = vUv;
        uv.x *= u_resolution.x / u_resolution.y;
        
        // Center point
        vec2 center = vec2(0.5 * (u_resolution.x / u_resolution.y), 0.5);

        float t = u_time * 0.4; // Slow, calming speed

        // --- ORB 1: COMPLIANCE GREEN (Apple Exercise Ring style) ---
        // Moves in a wide, slow circle
        vec2 pos1 = center + vec2(sin(t * 0.8) * 0.35, cos(t * 0.7) * 0.25);
        float orb1 = orb(uv, pos1, 0.7);
        vec3 col1 = vec3(0.20, 0.88, 0.45); // #34e073

        // --- ORB 2: HYGIENE BLUE (Apple Stand Ring style) ---
        // Moves in a figure-eight
        vec2 pos2 = center + vec2(cos(t * 0.5) * 0.4, sin(t * 1.1) * 0.3);
        float orb2 = orb(uv, pos2, 0.8);
        vec3 col2 = vec3(0.15, 0.65, 0.95); // #26a4f2

        // --- ORB 3: ALERT ORANGE (Apple Move Ring style) ---
        // Bobs gently near the bottom
        vec2 pos3 = center + vec2(sin(t * 0.3 + 2.0) * 0.5, cos(t * 0.4) * 0.2 - 0.2);
        float orb3 = orb(uv, pos3, 0.75);
        vec3 col3 = vec3(0.98, 0.35, 0.25); // #fa5b40

        // BLENDING
        // Base: White
        vec3 finalColor = vec3(0.97, 0.97, 0.98);
        
        // Layer the colors with 40-50% opacity
        finalColor = mix(finalColor, col1, orb1 * 0.45);
        finalColor = mix(finalColor, col2, orb2 * 0.40);
        finalColor = mix(finalColor, col3, orb3 * 0.40);

        // Add subtle noise for texture (optional, keeps it feeling organic)
        float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        finalColor += noise * 0.02;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    // 3. MESH
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
      material.uniforms.u_time.value = time * 0.001
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

    // 5. RESIZE HANDLER
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight)
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
      // No blur needed! The shader calculates the blur mathematically.
      style={{ opacity: 1.0 }} 
    />
  )
}
