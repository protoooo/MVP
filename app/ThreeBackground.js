'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. SETUP
    const scene = new THREE.Scene()
    // A clean, off-white background (Apple style)
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

    // APPLE HEALTH / MODERN COMPLIANCE VIBE
    // Soft, breathing orbs. Green (Pass), Blue (Clean), Orange (Alert).
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      varying vec2 vUv;

      // Function to draw a soft, glowing orb
      float orb(vec2 uv, vec2 pos, float size) {
          float d = length(uv - pos);
          // Smoothstep creates that "out of focus" bokeh look
          return smoothstep(size, size - 0.5, d); 
      }

      void main() {
        // Fix aspect ratio so circles stay circles
        vec2 uv = vUv;
        uv.x *= u_resolution.x / u_resolution.y;
        
        // Adjust coordinate center to match aspect ratio
        vec2 center = vec2(0.5 * (u_resolution.x / u_resolution.y), 0.5);

        float t = u_time * 0.5; // Slow, calm speed

        // --- ORB 1: Emerald Green (Compliance/Safety) ---
        // Moves in a slow wide circle
        vec2 pos1 = center + vec2(sin(t * 0.8) * 0.4, cos(t * 0.7) * 0.3);
        float orb1 = orb(uv, pos1, 0.6);
        vec3 col1 = vec3(0.06, 0.73, 0.50); // #10b981

        // --- ORB 2: Clean Blue (Hygiene/Water) ---
        // Moves in a figure-eight
        vec2 pos2 = center + vec2(cos(t * 0.5) * 0.5, sin(t * 1.1) * 0.4);
        float orb2 = orb(uv, pos2, 0.7);
        vec3 col2 = vec3(0.23, 0.51, 0.96); // #3b82f6

        // --- ORB 3: Warm Orange (Food/Activity) ---
        // Hovers near the bottom/center
        vec2 pos3 = center + vec2(sin(t * 0.3 + 2.0) * 0.6, cos(t * 0.4) * 0.2 - 0.2);
        float orb3 = orb(uv, pos3, 0.65);
        vec3 col3 = vec3(0.97, 0.55, 0.15); // #f97316

        // BLENDING
        // Start with white background
        vec3 finalColor = vec3(0.98, 0.98, 0.99);
        
        // Add colors with additive blending (light)
        finalColor = mix(finalColor, col1, orb1 * 0.4); // 0.4 opacity
        finalColor = mix(finalColor, col2, orb2 * 0.3);
        finalColor = mix(finalColor, col3, orb3 * 0.3);

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

    // 4. ANIMATION
    const animate = (time) => {
      material.uniforms.u_time.value = time * 0.001
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

    // 5. RESIZE
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
      // No blur needed here because the shader does the blur!
      // High opacity because the shader colors are already soft.
      style={{ opacity: 1.0 }} 
    />
  )
}
