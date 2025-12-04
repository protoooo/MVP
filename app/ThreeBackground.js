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
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // 2. THE SHADER
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

    // This fragment shader creates the "Glossy Mesh"
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      varying vec2 vUv;

      // GLOSSY COLORS:
      // These match the Stripe screenshot (Deep Purple, Pink, Orange, Cyan)
      const vec3 color1 = vec3(0.12, 0.12, 0.55); // Deep Blue/Purple
      const vec3 color2 = vec3(0.90, 0.20, 0.45); // Hot Pink/Magenta
      const vec3 color3 = vec3(0.98, 0.65, 0.10); // Bright Orange
      const vec3 color4 = vec3(0.00, 0.80, 0.90); // Cyan/Light Blue

      void main() {
        // Normalize coordinates
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // WARPING LOGIC (The "Glossy" movement)
        vec2 p = uv;
        float t = u_time * 0.3; // Speed

        // We layer sine waves to create complex fluid curves
        for(float i = 1.0; i < 5.0; i++){
            p.x += 0.3 / i * sin(i * 3.0 * p.y + t);
            p.y += 0.3 / i * cos(i * 3.0 * p.x + t);
        }

        // COLOR MIXING
        // We map the warped coordinates (p) to the colors
        float r = cos(p.x + p.y + 1.3) * 0.5 + 0.5;
        float g = sin(p.x + p.y + 2.0) * 0.5 + 0.5;
        float b = (sin(p.x + p.y + 1.0) + cos(p.x + 2.0)) * 0.25 + 0.5;

        // Gradient Blending
        vec3 col = mix(color1, color2, smoothstep(0.0, 0.9, r));
        col = mix(col, color3, smoothstep(0.0, 0.8, g));
        col = mix(col, color4, smoothstep(0.0, 0.9, b));

        // Add a subtle "shine" to make it look glossy
        col += 0.05 * sin(uv.x * 10.0 + u_time);

        gl_FragColor = vec4(col, 1.0);
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
      // Opacity at 0.9 keeps colors vibrant. 
      // If it's too bright for your text, lower this to 0.7 or 0.6
      style={{ opacity: 0.9 }} 
    />
  )
}
