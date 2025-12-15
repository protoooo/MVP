'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function GalaxyBackground() {
  const mountRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Respect reduced motion
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduceMotion) return

    // WebGL check (soft fail)
    const canvasTest = document.createElement('canvas')
    const gl =
      canvasTest.getContext('webgl', { alpha: true }) ||
      canvasTest.getContext('experimental-webgl', { alpha: true })
    if (!gl) return

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000)
    camera.position.z = 420

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0) // transparent
    mount.appendChild(renderer.domElement)

    // Starfield
    const starCount = 6500
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)

    const colorA = new THREE.Color('#a78bfa') // purple-ish
    const colorB = new THREE.Color('#60a5fa') // blue-ish
    const colorC = new THREE.Color('#ffffff')

    for (let i = 0; i < starCount; i++) {
      // Spread in a big sphere
      const r = 900 * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      const idx = i * 3
      positions[idx] = x
      positions[idx + 1] = y
      positions[idx + 2] = z

      // Color blend: mostly white with subtle blue/purple
      const t = Math.random()
      const c =
        t < 0.15 ? colorA.clone() : t < 0.35 ? colorB.clone() : colorC.clone()
      const jitter = (Math.random() - 0.5) * 0.08
      c.offsetHSL(0, 0, jitter)

      colors[idx] = c.r
      colors[idx + 1] = c.g
      colors[idx + 2] = c.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 1.15,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const stars = new THREE.Points(geometry, material)
    scene.add(stars)

    // A soft “nebula” glow (cheap + pretty)
    const glowGeo = new THREE.SphereGeometry(260, 64, 64)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.set(-120, 60, -280)
    scene.add(glow)

    const glow2 = glow.clone()
    glow2.material = glowMat.clone()
    glow2.material.color = new THREE.Color(0x2563eb)
    glow2.material.opacity = 0.06
    glow2.position.set(160, -40, -420)
    scene.add(glow2)

    const resize = () => {
      const w = mount.clientWidth || window.innerWidth
      const h = mount.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }

    resize()
    window.addEventListener('resize', resize)

    let t = 0
    const animate = () => {
      t += 0.0012
      // Slow drift
      stars.rotation.y = t * 0.6
      stars.rotation.x = t * 0.25
      glow.rotation.y = -t * 0.35
      glow2.rotation.y = t * 0.22

      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      glowGeo.dispose()
      glowMat.dispose()
      try {
        mount.removeChild(renderer.domElement)
      } catch {}
    }
  }, [])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
