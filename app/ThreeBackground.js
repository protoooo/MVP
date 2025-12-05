'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff) 

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

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

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      varying vec2 vUv;

      // PALETTE: Spearmint, Matte Blue
      const vec3 c_mint = vec3(0.40, 0.75, 0.56); // #67C090
      const vec3 c_blue = vec3(0.15, 0.40, 0.50); // #26667F
      const vec3 c_navy = vec3(0.07, 0.25, 0.44); // #124170

      float orb(vec2 uv, vec2 pos, float size) {
          return smoothstep(size, size - 0.6, length(uv - pos));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        float aspect = u_resolution.x / u_resolution.y;
        uv.x *= aspect;
        vec2 center = vec2(0.5 * aspect, 0.5);

        float t = u_time * 0.3;

        // Orb 1: Mint (Safety)
        vec2 pos1 = center + vec2(sin(t)*0.4, cos(t*0.8)*0.3);
        float o1 = orb(uv, pos1, 0.9);

        // Orb 2: Navy (Depth)
        vec2 pos2 = center + vec2(cos(t*0.6)*0.5, sin(t*0.5)*0.4);
        float o2 = orb(uv, pos2, 1.0);

        // Orb 3: Blue (Link)
        vec2 pos3 = center + vec2(sin(t*0.4+2.0)*0.6, cos(t*0.3)*0.2);
        float o3 = orb(uv, pos3, 0.8);

        // White Base
        vec3 color = vec3(1.0);

        // Subtract colors (Multiply blend for clean look)
        color = mix(color, c_mint, o1 * 0.4);
        color = mix(color, c_navy, o2 * 0.2);
        color = mix(color, c_blue, o3 * 0.3);

        gl_FragColor = vec4(color, 1.0);
      }
    `

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader })
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
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none" style={{ opacity: 0.8 }} />
}
