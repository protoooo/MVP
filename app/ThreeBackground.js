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

    // Orthographic camera is best for 2D gradient backgrounds
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // 2. THE SHADER (The Magic)
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      // Brand Colors converted to Vector3 (RGB 0-1 range)
      u_color1: { value: new THREE.Vector3(0.06, 0.73, 0.50) }, // Emerald
      u_color2: { value: new THREE.Vector3(0.23, 0.51, 0.96) }, // Blue
      u_color3: { value: new THREE.Vector3(0.58, 0.20, 0.92) }, // Purple
    }

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `

    // COMPLEX SIMPLEX NOISE SHADER
    // This creates the "Apple Health" fluid organic look
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      varying vec2 vUv;

      // --- SIMPLEX NOISE FUNCTION (Standard Math) ---
      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        // Normalize coordinates
        vec2 uv = vUv;
        
        // Slow down time
        float t = u_time * 0.15;

        // Create large, slow moving noise patterns
        float noise1 = snoise(uv * 1.5 + t);
        float noise2 = snoise(uv * 1.5 - t * 0.5 + vec2(5.2, 1.3));
        
        // Mix the noise
        float finalNoise = (noise1 + noise2) * 0.5;

        // Base background: Clean White/Grey
        vec3 color = vec3(0.97, 0.97, 0.97);

        // Mix in the brand colors based on noise patterns
        // We use smoothstep to create soft "blobs" rather than sharp lines
        
        // Layer 1: Emerald Green
        float mask1 = smoothstep(0.3, 0.7, sin(uv.x * 2.0 + t) + finalNoise);
        color = mix(color, u_color1, mask1 * 0.3); // 0.3 = 30% intensity

        // Layer 2: Protocol Blue
        float mask2 = smoothstep(0.3, 0.7, sin(uv.y * 2.0 - t) + finalNoise);
        color = mix(color, u_color2, mask2 * 0.3);

        // Layer 3: Purple (Subtle accents)
        float mask3 = smoothstep(0.4, 0.6, sin((uv.x + uv.y) * 2.0 + t) + finalNoise);
        color = mix(color, u_color3, mask3 * 0.2);

        gl_FragColor = vec4(color, 1.0);
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
      // High opacity because the shader handles the softness internally
      style={{ opacity: 1.0 }} 
    />
  )
}
