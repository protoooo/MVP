'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. SETUP
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff) // Pure White

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

    // STRIPE GLOSSY SHADER (With White Masking)
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      varying vec2 vUv;

      // STRIPE PALETTE (Deep Blue, Pink, Orange, Cyan)
      const vec3 c1 = vec3(0.10, 0.10, 0.45); // Midnight Blue
      const vec3 c2 = vec3(0.90, 0.15, 0.40); // Hot Pink
      const vec3 c3 = vec3(0.98, 0.60, 0.05); // Bright Orange
      const vec3 c4 = vec3(0.00, 0.85, 0.95); // Cyan

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // --- WARP LOGIC (The "Liquid" movement) ---
        vec2 p = uv;
        float t = u_time * 0.2; // Speed

        // Layered sine waves for fluid curves
        for(float i = 1.0; i < 4.0; i++){
            p.x += 0.35 / i * sin(i * 3.0 * p.y + t);
            p.y += 0.35 / i * cos(i * 3.0 * p.x + t);
        }

        // --- COLOR MIXING ---
        float r = cos(p.x + p.y + 1.3) * 0.5 + 0.5;
        float g = sin(p.x + p.y + 2.0) * 0.5 + 0.5;
        float b = (sin(p.x + p.y + 1.0) + cos(p.x + 2.0)) * 0.25 + 0.5;

        vec3 col = mix(c1, c2, smoothstep(0.0, 0.9, r));
        col = mix(col, c3, smoothstep(0.0, 0.8, g));
        col = mix(col, c4, smoothstep(0.0, 0.9, b));

        // Add Gloss/Shine
        col += 0.08 * sin(uv.x * 10.0 + u_time);

        // --- MASKING (The "Half Screen" Logic) ---
        // We create a diagonal gradient mask. 
        // 1.0 = Colorful, 0.0 = White.
        
        // Calculate diagonal gradient (Top-Right to Bottom-Left)
        float diagonal = (uv.x + uv.y) * 0.6; 
        
        // Focus color in the middle/top-right, fade to white elsewhere
        float mask = smoothstep(0.2, 0.8, diagonal);
        
        // Blend the color with white based on the mask
        vec3 finalColor = mix(vec3(1.0), col, mask);

        // Extra fade at the very bottom so it blends into the footer
        finalColor = mix(finalColor, vec3(1.0), smoothstep(0.2, 0.0, uv.y));

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
      // 0.8 Opacity so it's vibrant but not overwhelming
      style={{ opacity: 0.8 }} 
    />
  )
}
