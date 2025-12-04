'use client'

import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export default function StripeBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    container.appendChild(renderer.domElement)

    // --- Scene + Camera ---
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    // --- Geometry: full-screen quad ---
    const geometry = new THREE.PlaneBufferGeometry(2, 2)

    // --- Uniforms (using your Stripe-esque colors) ---
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      colorA: { value: new THREE.Vector3(0.35, 0.40, 1.0) }, // Deep Indigo Blue
      colorB: { value: new THREE.Vector3(1.0, 0.45, 0.70) }, // Soft Raspberry Pink
    }

    // --- Shaders (your code) ---
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
      uniform vec2 u_mouse;
      uniform vec3 colorA;
      uniform vec3 colorB;
      varying vec2 vUv;

      float rand(vec2 n) {
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f*f*(3.0-2.0*f);

          return mix(mix(rand(i + vec2(0.0,0.0)),
                         rand(i + vec2(1.0,0.0)), u.x),
                     mix(rand(i + vec2(0.0,1.0)),
                         rand(i + vec2(1.0,1.0)), u.x), u.y);
      }
      
      float fbm(vec2 p) {
          float total = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          for (int i = 0; i < 4; ++i) {
              total += noise(p * frequency) * amplitude;
              p *= 2.0;
              amplitude *= 0.5;
          }
          return total;
      }

      void main() {
          vec2 uv = vUv;
          
          float aspect = u_resolution.x / u_resolution.y;
          uv.x *= aspect;

          float time = u_time * 0.00007; // slow, graceful

          vec2 p = uv * 3.0;
          
          vec2 flowOffset = vec2(
              fbm(p * 0.5 + time), 
              fbm(p * 0.5 - time)
          ) * 0.5;
          
          vec2 distortedUV = uv + flowOffset;
          
          float pattern = sin(distortedUV.x * 2.0 + distortedUV.y * 3.0 + time * 0.5);
          pattern += fbm(distortedUV * 5.0) * 0.5;
          
          pattern = pattern * 0.3 + 0.5; 
          
          float t = pow(pattern, 1.5);
          vec3 finalColor = mix(colorA, colorB, t);
          
          vec2 center = vec2(0.5 * aspect, 0.5);
          float dist = distance(uv, center);
          float vignette = smoothstep(0.9, 0.3, dist * 1.5);
          finalColor *= vignette;

          gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // --- Sizing ---
    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      uniforms.u_resolution.value.set(width, height)
    }

    resize()
    window.addEventListener('resize', resize)

    // --- Mouse interaction (optional but nice) ---
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = 1.0 - (e.clientY - rect.top) / rect.height
      uniforms.u_mouse.value.set(x, y)
    }
    window.addEventListener('mousemove', onMouseMove)

    // --- Animation loop ---
    let frameId
    const startTime = performance.now()

    const animate = () => {
      const now = performance.now()
      uniforms.u_time.value = now - startTime
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Full-bleed background container
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  )
}
