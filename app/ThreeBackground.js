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

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    // Moved camera back to see the wider spread
    camera.position.z = 4.5 

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // 2. GEOMETRY
    // Radius: 2.5 (Spread out across screen)
    // Detail: 20 (Far fewer particles - was 60)
    const geometry = new THREE.IcosahedronGeometry(2.5, 20) 

    // 3. SHADER
    const uniforms = {
      u_time: { value: 0.0 },
      u_bloom: { value: 0.0 },
      u_colorA: { value: new THREE.Color(0x059669) }, // Emerald
      u_colorB: { value: new THREE.Color(0x2563eb) }, // Blue
    }

    const vertexShader = `
      uniform float u_time;
      uniform float u_bloom; 
      varying vec3 vColor;
      uniform vec3 u_colorA;
      uniform vec3 u_colorB;

      // Simplex Noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                      dot(p2,x2), dot(p3,x3) ) );
      }

      void main() {
        // Lower frequency noise (0.8) for wider, lazier waves
        float noise = snoise(position * 0.8 + u_time * 0.1);
        
        // HIGHER DISPLACEMENT (1.2)
        // This pushes the particles much further apart, breaking the sphere shape
        vec3 newPos = position + normal * (noise * 1.2 * u_bloom);

        vColor = mix(u_colorA, u_colorB, noise * 0.5 + 0.5);

        vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
        
        // Slightly smaller points since they are spread out (looks cleaner)
        gl_PointSize = (5.0 * u_bloom) * (10.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `

    const fragmentShader = `
      varying vec3 vColor;
      void main() {
        float r = distance(gl_PointCoord, vec2(0.5));
        if (r > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.3, 0.5, r);
        gl_FragColor = vec4(vColor, alpha * 0.8);
      }
    `

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // 4. ANIMATION
    let bloomValue = 0 
    let rotationSpeed = 0

    const animate = (time) => {
      // Bloom 0 -> 1
      bloomValue = THREE.MathUtils.lerp(bloomValue, 1, 0.01)
      material.uniforms.u_bloom.value = bloomValue

      // Time
      material.uniforms.u_time.value = time * 0.0003
      
      // Rotate
      rotationSpeed += 0.0001
      points.rotation.y = rotationSpeed
      points.rotation.z = Math.sin(time * 0.0001) * 0.05

      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
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
      style={{ opacity: 0.8 }} 
    />
  )
}
