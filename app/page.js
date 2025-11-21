'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// --- 1. Particle Background (Fixed: No Scroll Jitter) ---
const ParticleBackground = () => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId

    // The 5 Card Colors + Brand Blue
    const colors = [
      '#d97706', // Amber
      '#be123c', // Rose
      '#16a34a', // Green
      '#0284c7', // Sky
      '#4338ca', // Indigo
      '#4F759B'  // Brand Blue
    ]

    const particleCount = 60 
    const connectionDistance = 100 
    const mouseDistance = 150
    const particles = []

    let mouse = { x: null, y: null }

    // FIX: Initialize particles ONLY ONCE, not on every resize
    function initParticles() {
      particles.length = 0
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }
    }

    const handleResize = () => {
      if (canvas.parentElement) {
        // Just update dimensions, don't kill the particles
        canvas.width = canvas.parentElement.offsetWidth
        canvas.height = canvas.parentElement.offsetHeight
      }
    }

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = null
      mouse.y = null
    }

    class Particle {
      constructor() {
        // Randomize initial position
        this.x = Math.random() * (canvas.width || window.innerWidth)
        this.y = Math.random() * (canvas.height || window.innerHeight)
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.size = Math.random() * 2 + 1.5 
        this.color = colors[Math.floor(Math.random() * colors.length)]
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        // Bounce off edges (Dynamic based on current canvas size)
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1

        if (mouse.x != null) {
          let dx = mouse.x - this.x
          let dy = mouse.y - this.y
          let distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < mouseDistance) {
            const forceDirectionX = dx / distance
            const forceDirectionY = dy / distance
            const force = (mouseDistance - distance) / mouseDistance
            const directionX = forceDirectionX * force * 0.6
            const directionY = forceDirectionY * force * 0.6
            this.x -= directionX
            this.y -= directionY
          }
        }
      }

      draw() {
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < particles.length; i++) {
        particles[i].update()
        particles[i].draw()
        for (let j = i; j < particles.length; j++) {
          let dx = particles[i].x - particles[j].x
          let dy = particles[i].y - particles[j].y
          let distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < connectionDistance) {
            let opacity = 1 - (distance / connectionDistance)
            ctx.globalAlpha = opacity * 0.4 
            
            const gradient = ctx.createLinearGradient(particles[i].x, particles[i].y, particles[j].x, particles[j].y)
            gradient.addColorStop(0, particles[i].color)
            gradient.addColorStop(1, particles[j].color)
            
            ctx.strokeStyle = gradient
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
            
            ctx.globalAlpha = 1.0
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate)
    }

    // Sequence matters:
    handleResize() // 1. Set Size
    initParticles() // 2. Create Dots
    animate() // 3. Start Moving

    window.addEventListener('resize', handleResize)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove)
        canvas.removeEventListener('mouseleave', handleMouseLeave)
      }
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto z-0 opacity-70"
    />
  )
}

// --- MAIN COMPONENT ---

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState('signup')
  const [mounted, setMounted] = useState(false)
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (view === 'signup') {
        const productionUrl = 'https://no-rap-production.up.railway.app'
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${productionUrl}/auth/callback`,
            data: { county: 'washtenaw' }
          }
        })
        if (error) throw error
        if (data.session) {
          router.push('/pricing')
        } else {
          setMessage({ type: 'success', text: 'Account created! Check email to confirm.' })
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed')
          .eq('id', data.session.user.id)
          .single()

        if (profile?.is_subscribed) {
          router.push('/documents')
        } else {
          router.push('/pricing')
        }
      }
    } catch (error) {
      console.error("Auth Error:", error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const TracingCard = ({ delay, borderColor, children }) => (
    <div className="relative bg-white/90 backdrop-blur-sm rounded-xl p-5 shadow-sm group border border-slate-200 transition-all duration-300 z-10">
      <div className="relative z-10">
        {children}
      </div>
      <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-xl overflow-visible">
        <rect 
          x="1" y="1" 
          width="calc(100% - 2px)" 
          height="calc(100% - 2px)" 
          rx="11" 
          fill="none" 
          stroke={borderColor} 
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1000" 
          strokeDashoffset="1000"
          className={`draw-border ${mounted ? 'animate-draw' : ''}`}
          style={{ animationDelay: delay }}
        />
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-white">
      <style jsx global>{`
        @keyframes drawBorder {
          to { stroke-dashoffset: 0; }
        }
        .animate-draw {
          animation: drawBorder 2.5s ease-out forwards;
        }
      `}</style>

      <div className="flex flex-col-reverse lg:flex-row min-h-screen">
        
        <div className="w-full lg:w-1/2 bg-slate-50 border-t lg:border-t-0 lg:border-r border-slate-200 flex flex-col lg:pt-20 relative overflow-hidden">
          <ParticleBackground />
          
          <div className="hidden lg:block px-6 sm:px-8 lg:px-12 pt-6 pb-4 shrink-0 lg:absolute lg:top-0 lg:left-0 lg:w-full z-10">
            <div className={`inline-block transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                protocol<span className="font-normal text-slate-600">LM</span>
              </h1>
              <div className="h-1.5 w-full bg-[#4F759B] rounded-full opacity-90"></div>
            </div>
            <div className={`text-xs text-slate-900 font-bold mt-1 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              Michigan Restaurant Compliance
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-start px-6 sm:px-8 lg:px-12 py-8 lg:pb-8 lg:mt-8 z-10">
            <div className="relative max-w-xl pl-6 mx-auto w-full">
              <div 
                className="absolute left-0 top-2 w-1 bg-gradient-to-b from-[#4F759B] to-slate-300 rounded-full transition-all duration-[1500ms] ease-out"
                style={{ height: mounted ? '95%' : '0%' }}
              ></div>

              <div className="space-y-4">
                <TracingCard delay="100ms" borderColor="#d97706">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-slate-900 font-bold text-sm sm:text-base mb-1.5">Health inspections happen without warning</h3>
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">Be ready at all times with instant compliance checks.</p>
                    </div>
                  </div>
                </TracingCard>

                <TracingCard delay="400ms" borderColor="#be123c">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-rose-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-slate-900 font-bold text-sm sm:text-base mb-1.5">Critical violations cost you money</h3>
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">Re-inspections, closures, and lost revenue add up fast.</p>
                    </div>
                  </div>
                </TracingCard>

                <TracingCard delay="700ms" borderColor="#16a34a">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-green-50 flex items-center justify-center border border-green-100">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-slate-900 font-bold text-sm sm:text-base mb-1.5">Verify compliance with a photo</h3>
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">Snap a picture of equipment or prep areas. Our system checks it against County, State, and Federal regulations.</p>
                    </div>
                  </div>
                </TracingCard>

                <TracingCard delay="1000ms" borderColor="#0284c7">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-slate-900 font-bold text-sm sm:text-base mb-1.5">Questions need immediate answers</h3>
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">Your team needs answers in seconds, not hours.</p>
                    </div>
                  </div>
                </TracingCard>

                <TracingCard delay="1300ms" borderColor="#4338ca">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-slate-900 font-bold text-sm sm:text-base mb-1.5">One tool. All your answers.</h3>
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">FDA Food Code, Michigan guidelines, and intelligent reasoning.</p>
                    </div>
                  </div>
                </TracingCard>

              </div>
            </div>
          </div>

          <div className={`px-6 sm:px-8 lg:px-12 pb-6 text-slate-400 text-xs font-medium transition-opacity duration-1000 delay-1000 shrink-0 text-center lg:text-left z-10 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            © 2025 protocolLM. All rights reserved.
          </div>
        </div>

        <div className="w-full lg:w-1/2 bg-white flex flex-col justify-start pt-12 lg:pt-40 px-6 sm:px-8 lg:p-12 z-20">
          <div className="w-full max-w-md mx-auto">
            
            <div className="mb-8 lg:hidden">
              <div className="inline-block">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">protocol<span className="font-normal">LM</span></h1>
                <div className="h-1.5 w-full bg-[#4F759B] rounded-full"></div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                {view === 'signup' ? 'Stop guessing. Start knowing.' : 'Welcome back'}
              </h2>
              <p className="text-slate-600 text-sm">
                {view === 'signup' ? 'Join Michigan restaurants staying ahead of inspections' : 'Sign in to access your dashboard'}
              </p>
            </div>

            <div className="bg-slate-100 p-1 rounded-xl mb-5">
              <div className="flex rounded-[10px] overflow-hidden">
                <button 
                  onClick={() => { setView('signup'); setMessage(null); }} 
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    view === 'signup' 
                      ? 'bg-white text-[#4F759B] shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Sign up
                </button>
                <button 
                  onClick={() => { setView('login'); setMessage(null); }} 
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    view === 'login' 
                      ? 'bg-white text-[#4F759B] shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Sign in
                </button>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">Email address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#4F759B] focus:ring-4 focus:ring-[#4F759B]/20 focus:outline-none text-slate-900 transition text-sm" 
                  placeholder="you@restaurant.com" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={6} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#4F759B] focus:ring-4 focus:ring-[#4F759B]/20 focus:outline-none text-slate-900 transition text-sm" 
                  placeholder="••••••••" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#4F759B] hover:bg-[#3e5c7a] text-white font-bold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-sm"
              >
                {loading ? 'Processing...' : (view === 'signup' ? 'Start 30-day free trial' : 'Sign in')}
              </button>

              {message && (
                <div className={`p-3 rounded-xl text-xs font-medium ${message.type === 'error' ? 'bg-red-50 border-2 border-red-200 text-red-800' : 'bg-slate-50 border-2 border-[#4F759B] text-[#4F759B]'}`}>
                  {message.text}
                </div>
              )}
            </form>

            {view === 'signup' && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-center text-xs text-slate-600 mb-3 font-medium">30-day free trial • From $49/month</p>
                
                <button 
                  onClick={() => router.push('/pricing')} 
                  className="w-full bg-white border-2 border-slate-200 hover:border-[#4F759B] text-slate-700 hover:text-[#4F759B] font-bold py-3 rounded-xl transition-all duration-300 text-sm"
                >
                  View pricing plans
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
