'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. SETUP
    const scene = new THREE.Scene()
    // Apple style clean background (very slight off-white)
    scene.background = new THREE.Color(0xfbfbfb) 

    // Orthographic camera is best for 2D gradient backgrounds
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // 2. THE GEOMETRY
    // A simple flat plane that covers the screen
    const geometry = new THREE.PlaneGeometry(2, 2)

    // 3. THE SHADER
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      // Brand Colors (Apple Health Style)
      u_colorA: { value: new THREE.Color(0x10b981) }, // Emerald (Safety/Compliance)
      u_colorB: { value: new THREE.Color(0x3b82f6) }, // Blue (Hygiene/Clean)
      u_colorC: { value: new THREE.Color(0xf43f5e) }, // Rose/Red (Alert/Heat)
    }

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `

    // THIS IS THE APPLE HEALTH MAGIC
    // Creating soft, overlapping "Metaballs" of color
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_colorA;
      uniform vec3 u_colorB;
      uniform vec3 u_colorC;
      varying vec2 vUv;

      void main() {
        // Normalize coordinates to keep circles round regardless of screen shape
        vec2 uv = vUv;
        float aspect = u_resolution.x / u_resolution.y;
        uv.x *= aspect;
        
        // Adjust center to match aspect ratio
        vec2 center = vec2(0.5 * aspect, 0.5);

        // Slow down time for a "breathing" effect
        float t = u_time * 0.3;

        // --- ORB 1: Emerald (Left/Center) ---
        // Moves in a gentle figure-8
        vec2 pos1 = center + vec2(sin(t)*0.3, cos(t * 0.5)*0.2);
        float d1 = length(uv - pos1);
        // smoothstep creates the soft "blurred" edge
        float a1 = smoothstep(0.8, 0.0, d1); 

        // --- ORB 2: Blue (Right) ---
        // Moves in a counter-circle
        vec2 pos2 = center + vec2(cos(t * 0.7)*0.4, sin(t * 0.8)*0.3);
        float d2 = length(uv - pos2);
        float a2 = smoothstep(0.9, 0.0, d2);

        // --- ORB 3: Rose (Bottom/Floating) ---
        // Bobs up and down gently
        vec2 pos3 = center + vec2(sin(t * 0.2)*0.5, -0.2 + sin(t * 0.5)*0.2);
        float d3 = length(uv - pos3);
        float a3 = smoothstep(0.8, 0.0, d3);

        // BLENDING
        // Start with white
        vec3 color = vec3(0.98, 0.98, 0.99);

        // Mix in colors softly
        // We use mix() to blend them like watercolors
        color = mix(color, u_colorA, a1 * 0.4); // 0.4 intensity
        color = mix(color, u_colorB, a2 * 0.4);
        color = mix(color, u_colorC, a3 * 0.3);

        // Add a tiny bit of grain/noise for texture (very subtle)
        float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        color += noise * 0.015;

        gl_FragColor = vec4(color, 1.0);
      }
    `

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
      // Keep opacity high because the shader handles the softness internally
      style={{ opacity: 1.0 }} 
    />
  )
}
