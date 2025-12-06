'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, JetBrains_Mono, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const STRIPE_PRICE_ID_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY
const STRIPE_PRICE_ID_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL

// --- ICONS (Bold, Technical) ---
const Icons = {
  Camera: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Zap: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  ArrowRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Plus: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
  Book: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  SignOut: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}

const GlobalStyles = () => (
  <style jsx global>{`
    body { background-color: #F3F4F6; color: #111827; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .tech-grid { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px); }
    .loader { width: 18px; height: 18px; border: 2px solid #e2e8f0; border-bottom-color: #000000; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite; }
    @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `}</style>
)

const AuthModal = ({ isOpen, onClose, message }) => {
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [googleLoading, setGoogleLoading] = useState(false); const [statusMessage, setStatusMessage] = useState(''); const supabase = createClient();
  const handleEmailAuth = async (e) => { e.preventDefault(); setLoading(true); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/auth/callback' } }); setStatusMessage(error ? error.message : 'Check your email.'); setLoading(false); };
  const handleGoogleAuth = async () => { setGoogleLoading(true); await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/auth/callback' } }); };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white border-2 border-slate-900 rounded-xl w-full max-w-sm p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-8"><div><h2 className={`text-xl font-bold text-slate-900 ${outfit.className}`}>{message || 'Save your results'}</h2><p className="text-xs text-slate-500 font-medium">Create a free account to continue.</p></div><button onClick={onClose}><Icons.X /></button></div>
        <button onClick={handleGoogleAuth} disabled={googleLoading} className="w-full bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 font-bold py-3 rounded-lg mb-4 text-sm transition-all">{googleLoading ? <div className="loader"/> : "Continue with Google"}</button>
        <form onSubmit={handleEmailAuth} className="space-y-3"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-sm focus:border-slate-900 outline-none" /><button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg text-sm">{loading ? 'Sending...' : 'Continue with Email'}</button></form>
        {statusMessage && <div className="mt-4 p-3 bg-slate-100 text-xs rounded">{statusMessage}</div>}
      </div>
    </div>
  )
}

const PricingModal = ({ handleCheckout, loading, onClose }) => {
  const [billing, setBilling] = useState('month');
  return (
    <div className="fixed inset-0 z-[1000] bg-white/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border-2 border-slate-100 rounded-2xl p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400"><Icons.X /></button>
        <div className={`text-center font-bold text-slate-900 text-2xl mb-2 ${outfit.className}`}>Protocol License</div>
        <div className="flex justify-center my-6"><div className="bg-slate-100 p-1 rounded-lg flex"><button onClick={() => setBilling('month')} className={`px-4 py-2 rounded-md text-xs font-bold ${billing === 'month' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Monthly</button><button onClick={() => setBilling('year')} className={`px-4 py-2 rounded-md text-xs font-bold ${billing === 'year' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Yearly (-17%)</button></div></div>
        <div className="text-center mb-8"><span className={`text-6xl font-black text-slate-900 ${outfit.className}`}>${billing === 'month' ? '50' : '500'}</span><span className="text-slate-400 font-bold">/{billing === 'month' ? 'mo' : 'yr'}</span></div>
        <button onClick={() => handleCheckout(billing === 'month' ? STRIPE_PRICE_ID_MONTHLY : STRIPE_PRICE_ID_ANNUAL)} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg text-sm uppercase tracking-widest shadow-lg transition-all">{loading ? 'Processing...' : 'Start 7-Day Free Trial'}</button>
      </div>
    </div>
  )
}

export default function Page() {
  const [isLoading, setIsLoading] = useState(true); const [session, setSession] = useState(null); const [hasSub, setHasSub] = useState(false); const [messages, setMessages] = useState([]); const [input, setInput] = useState(''); const [sending, setSending] = useState(false); const [showAuth, setShowAuth] = useState(false); const [authMsg, setAuthMsg] = useState(''); const [img, setImg] = useState(null); const [mode, setMode] = useState('chat'); const [showPricing, setShowPricing] = useState(false); const [checkoutLoad, setCheckoutLoad] = useState(false);
  const [usage, setUsage] = useState({ image: false, chat: false }); // LOCAL STORAGE TRACKING
  const fileRef = useRef(null); const scrollRef = useRef(null); const supabase = useState(() => createClient())[0];

  useEffect(() => {
    const localUsage = localStorage.getItem('protocol_usage'); if (localUsage) setUsage(JSON.parse(localUsage));
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession(); setSession(s);
      if (s) { const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', s.user.id).in('status', ['active', 'trialing']).maybeSingle(); if (s.user.email === ADMIN_EMAIL || sub) setHasSub(true); }
      setIsLoading(false);
    }; init();
  }, []);

  const handleAction = (newMode) => {
    setMode(newMode);
    // FREE TRIAL LOGIC: If no session AND already used, block.
    if (!session && usage[newMode]) { setAuthMsg('Free usage limit reached.'); setShowAuth(true); return; }
    if (newMode === 'image') fileRef.current?.click();
  }

  const handleSend = async () => {
    if ((!input.trim() && !img) || sending) return;
    if (!session) {
      if ((img && usage.image) || (!img && usage.chat)) { setAuthMsg('Free trial used. Sign in to save results.'); setShowAuth(true); return; }
      const newUsage = { ...usage, [img ? 'image' : 'chat']: true }; setUsage(newUsage); localStorage.setItem('protocol_usage', JSON.stringify(newUsage));
    } else if (!hasSub) { setShowPricing(true); return; }

    const newMsg = { role: 'user', content: input, image: img }; setMessages(p => [...p, newMsg]); setInput(''); setImg(null); setSending(true); setMessages(p => [...p, { role: 'assistant', content: '' }]);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...messages, { ...newMsg }], image: img, mode }) });
      const data = await res.json(); setMessages(p => { const u = [...p]; u[u.length-1].content = data.message; return u; });
      if (!session) { setTimeout(() => { setAuthMsg('Create free account to save this report.'); setShowAuth(true); }, 4000); }
    } catch { setMessages(p => { const u = [...p]; u[u.length-1].content = 'Error.'; return u; }); } finally { setSending(false); }
  }

  const handleCheckout = async (priceId) => { setCheckoutLoad(true); try { const { data: { session } } = await supabase.auth.getSession(); const res = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ priceId }) }); const d = await res.json(); if (d.url) window.location.href = d.url; } catch(e){alert('Error')} setCheckoutLoad(false); }

  if (isLoading) return <div className="fixed inset-0 bg-[#F3F4F6]" />;

  return (
    <>
      <GlobalStyles />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} message={authMsg} />
      {showPricing && <PricingModal handleCheckout={handleCheckout} loading={checkoutLoad} onClose={() => setShowPricing(false)} />}
      
      <div className="min-h-screen w-full font-sans selection:bg-black selection:text-white flex flex-col relative bg-[#F3F4F6]">
        <div className="absolute inset-0 z-0 tech-grid opacity-40 pointer-events-none" />
        
        {/* NAV */}
        <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white/80 backdrop-blur-md">
           <div className={`text-xl font-bold text-slate-900 tracking-tighter ${outfit.className}`}>protocol<span className="text-slate-400">LM</span></div>
           {!session ? (
             <button onClick={() => setShowAuth(true)} className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all">Sign In</button>
           ) : (
             <button onClick={() => supabase.auth.signOut().then(()=>window.location.href='/')} className="text-xs font-bold text-slate-500 hover:text-red-600">LOGOUT</button>
           )}
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
           {messages.length === 0 && !img ? (
              <div className="flex-1 overflow-y-auto px-4 pb-20">
                 <div className="max-w-4xl mx-auto mt-16 text-center space-y-6">
                    <span className={`inline-block px-3 py-1 rounded border border-slate-300 bg-white text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ${mono.className}`}>Washtenaw County • Food Service</span>
                    <h1 className={`text-4xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[0.9] ${outfit.className}`}>
                      Never fail a<br/>health inspection.
                    </h1>
                    <p className={`text-lg text-slate-500 max-w-xl mx-auto leading-relaxed ${inter.className}`}>
                      Instant photo analysis and code-backed answers. <br/>
                      <span className="text-slate-900 font-bold">Try it once for free. No login required.</span>
                    </p>

                    {/* THE MODULES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12 text-left">
                        {/* VISUAL INSPECTION */}
                        <div onClick={() => handleAction('image')} className="group bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden">
                           <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Most Popular</div>
                           <div className="mb-6 text-emerald-600 w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100"><Icons.Camera /></div>
                           <h3 className={`text-2xl font-bold text-slate-900 mb-2 ${outfit.className}`}>Visual Inspection</h3>
                           <p className="text-sm text-slate-500 mb-8 h-10">Take a photo. We detect Priority (P) violations instantly.</p>
                           <button className="w-full py-3 bg-emerald-600 group-hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-colors">
                              Scan Kitchen (1 Free)
                           </button>
                        </div>

                        {/* REGULATORY CHAT */}
                        <div onClick={() => handleAction('chat')} className="group bg-white border-2 border-slate-200 hover:border-blue-500 rounded-xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer">
                           <div className="mb-6 text-blue-600 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100"><Icons.Zap /></div>
                           <h3 className={`text-2xl font-bold text-slate-900 mb-2 ${outfit.className}`}>Consultant Chat</h3>
                           <p className="text-sm text-slate-500 mb-8 h-10">Ask questions. Get answers grounded in Washtenaw code.</p>
                           <button className="w-full py-3 bg-white border-2 border-slate-200 group-hover:border-blue-500 text-slate-900 group-hover:text-blue-600 font-bold text-xs uppercase tracking-widest rounded-lg transition-colors">
                              Ask Question (1 Free)
                           </button>
                        </div>
                    </div>
                    
                    <div className="mt-20 border-t border-slate-200 pt-8 text-center">
                       <p className={`text-xs text-slate-400 font-bold uppercase tracking-widest mb-4 ${mono.className}`}>Database Includes</p>
                       <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-600">
                          <span>WASHTENAW ENFORCEMENT</span>
                          <span>•</span>
                          <span>MI MODIFIED FOOD CODE</span>
                          <span>•</span>
                          <span>FDA 2022</span>
                       </div>
                    </div>
                 </div>
              </div>
           ) : (
              /* CHAT UI */
              <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full h-full">
                 <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
                    {messages.map((m, i) => (
                       <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
                          <div className={`max-w-[85%] p-5 rounded-xl text-sm leading-7 shadow-sm ${m.role==='user'?'bg-slate-900 text-white':'bg-white border border-slate-200 text-slate-800'}`}>
                             {m.image && <img src={m.image} className="rounded-lg mb-3 border border-white/20"/>}
                             {m.role==='assistant' && m.content==='' ? <div className="loader"/> : <div className="whitespace-pre-wrap">{m.content}</div>}
                          </div>
                       </div>
                    ))}
                 </div>
                 <div className="p-4 pb-8 bg-gradient-to-t from-[#F3F4F6] via-[#F3F4F6] to-transparent">
                    {img && <div className="mb-2 inline-flex items-center gap-2 bg-white border border-slate-200 px-3 py-1 rounded text-xs font-bold text-emerald-600"><Icons.Camera /> Image Ready <button onClick={()=>setImg(null)}><Icons.X/></button></div>}
                    <div className="flex gap-2 bg-white p-2 rounded-xl border-2 border-slate-200 shadow-lg focus-within:border-slate-900 transition-colors">
                       <input type="file" ref={fileRef} onChange={(e)=>{if(e.target.files[0]) compressImage(e.target.files[0]).then(setImg)}} className="hidden" />
                       <button onClick={()=>fileRef.current.click()} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg"><Icons.Plus/></button>
                       <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') handleSend()}} placeholder="Ask protocol..." className="flex-1 bg-transparent outline-none text-slate-900 placeholder-slate-400 text-sm font-medium px-2"/>
                       <button onClick={handleSend} disabled={sending} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50">{sending ? <div className="loader"/> : <Icons.ArrowRight/>}</button>
                    </div>
                 </div>
              </div>
           )}
        </main>
      </div>
    </>
  )
}
