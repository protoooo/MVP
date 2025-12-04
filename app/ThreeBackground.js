'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. SETUP
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff) 

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

    // GLOSSY RIBBON SHADER (Spearmint & Matte Blue)
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      varying vec2 vUv;

      // NEW PALETTE: Lighter, Spearmint, Matte
      // 1. Matte Mid Blue (Base)
      const vec3 c1 = vec3(0.25, 0.45, 0.65); 
      // 2. Soft Teal (Mid)
      const vec3 c2 = vec3(0.35, 0.75, 0.70); 
      // 3. Spearmint (Highlight)
      const vec3 c3 = vec3(0.50, 0.90, 0.75); 
      // 4. Ice White (Peak)
      const vec3 c4 = vec3(0.92, 0.98, 0.98); 

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // --- WARP LOGIC ---
        vec2 p = uv;
        // FASTER SPEED (0.2 -> 0.25)
        float t = u_time * 0.25; 

        for(float i = 1.0; i < 4.0; i++){
            p.x += 0.35 / i * sin(i * 3.0 * p.y + t);
            p.y += 0.35 / i * cos(i * 3.0 * p.x + t);
        }

        // --- COLOR MIXING ---
        float r = cos(p.x + p.y + 1.3) * 0.5 + 0.5;
        float g = sin(p.x + p.y + 2.0) * 0.5 + 0.5;
        float b = (sin(p.x + p.y + 1.0) + cos(p.x + 2.0)) * 0.25 + 0.5;

        // Blend the palette
        vec3 col = mix(c1, c2, smoothstep(0.0, 0.9, r));
        col = mix(col, c3, smoothstep(0.0, 0.8, g));
        col = mix(col, c4, smoothstep(0.0, 0.9, b));

        // Add Gloss (Subtler now to reduce "weird brightness")
        col += 0.04 * sin(uv.x * 10.0 + u_time);

        // --- MASKING ---
        // Softer mask gradient
        float diagonal = (uv.x + uv.y) * 0.6; 
        
        // Widen the smoothstep range (0.1 to 0.9) to soften the edge
        float mask = smoothstep(0.1, 0.9, diagonal);
        
        vec3 finalColor = mix(vec3(1.0), col, mask);

        // Footer fade
        finalColor = mix(finalColor, vec3(1.0), smoothstep(0.15, 0.0, uv.y));

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const animate = (time) => {
      material.uniforms.u_time.value = time * 0.001
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

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
      style={{ opacity: 0.9 }} 
    />
  )
}
