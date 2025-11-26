import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import DemoChat from '@/components/DemoChat'

export default async function Home() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_subscribed')
      .eq('id', session.user.id)
      .single()
    
    if (profile?.is_subscribed) {
      redirect('/documents')
    }
  }

  const demoScenarios = [
    {
      q: "The walk-in cooler is reading 45°F. The repair tech can't come until tomorrow morning. Do I have to throw away $800 of prepped inventory or can we save it?",
      a: "This is a critical situation. FDA Code 3-501.16 requires TCS foods be held at 41°F or below. If the food has been above 41°F for more than 4 hours, it must be discarded immediately to prevent liability. If less than 4 hours, you can move it to a working cooler or pack with ice. Do not risk serving it."
    },
    {
      q: "My head line cook showed up with a 'stomach bug' (vomiting) but says he's fine to work if he just stays on the grill. We are fully booked. Can I let him work?",
      a: "Absolutely not. FDA Code 2-201.12 mandates EXCLUSION for employees with vomiting or diarrhea. Keeping him on the line risks a Norovirus outbreak, which could permanently shut down your business and lead to lawsuits. Send him home immediately for at least 24 hours after symptoms stop."
    },
    {
      q: "I caught the prep team thawing frozen chicken in a sink of stagnant warm water to 'speed it up'. They say running water costs too much money. Who is right?",
      a: "You are. Stagnant warm water is a major bacterial hazard and a Priority Violation (3-501.13). Thawing must be done under cool running water (70°F or below), in the fridge, or as part of cooking. Using warm stagnant water breeds Salmonella and ruins the product quality."
    },
    {
      q: "The hot water handle broke off the handwash sink in the kitchen. We have a pair of pliers there to turn it on. Is that a violation?",
      a: "Yes, it is a Priority Foundation violation (5-202.12). Handwashing sinks must be 'easily accessible' and maintained in good repair. Inspectors often cite this because pliers are not sanitary and discourage staff from washing hands. Fix it immediately or risk a follow-up inspection fee."
    },
    {
      q: "We found mouse droppings in the dry storage corner this morning. Pest control is coming Friday. Do we have to self-close the restaurant today?",
      a: "Imminent Health Hazard. FDA Code 8-404.11 usually requires immediate cessation of operations if there is a 'gross insanitary occurrence' like a rodent infestation that contaminates food. If it is isolated and you can sanitize/discard affected product immediately, you may stay open, but if active pests are seen in food areas, you must close to protect your license."
    },
    {
      q: "A customer ordered a burger 'Rare' for their 6-year-old child. My server refused. The customer is furious and refusing to pay. What is the actual rule?",
      a: "Your server is correct. FDA Code 3-801.11(C) prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children, elderly). Even with a consumer advisory, you cannot legally serve a rare burger to a child. It is a liability trap."
    }
  ]

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white">
      {/* Navigation */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="font-bold text-2xl tracking-tighter">
          protocol<span className="text-[#6b85a3]">LM</span>
        </div>
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/pricing" className="text-sm sm:text-base font-bold text-slate-600 hover:text-slate-900 transition-colors uppercase tracking-wider">
            Pricing
          </Link>
          <Link href="/auth?view=sign-in" className="text-sm sm:text-base font-bold text-slate-600 hover:text-slate-900 transition-colors uppercase tracking-wider">
            Sign In
          </Link>
          <Link href="/auth?view=sign-up" className="hidden sm:block bg-slate-900 text-white px-5 py-2.5 rounded-sm font-bold text-sm sm:text-base transition-all hover:bg-[#6b85a3] uppercase tracking-wider shadow-sm hover:shadow-md">
            Create Account
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        
        {/* Left Column: Copy */}
        <div className="space-y-8 max-w-2xl">
          <div className="inline-block bg-white border border-slate-200 px-3 py-1 rounded-sm">
            <span className="text-[10px] sm:text-xs font-bold text-[#6b85a3] uppercase tracking-[0.2em]">Regulatory Intelligence</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            Your health inspector <br />
            <span className="text-[#6b85a3]">is already here.</span>
          </h1>
          
          <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
            Instant answers to health code violations, unexpected inspections, and compliance anxiety. Built on your county's specific regulatory database.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link href="/auth?view=sign-up" className="bg-[#6b85a3] text-white px-8 py-4 rounded-sm font-bold text-sm transition-all hover:bg-slate-800 text-center uppercase tracking-widest shadow-lg hover:shadow-xl translate-y-0 hover:-translate-y-1">
              Start Free Trial
            </Link>
            <Link href="/pricing" className="bg-white border border-slate-300 text-slate-700 px-8 py-4 rounded-sm font-bold text-sm transition-all hover:border-slate-800 hover:text-slate-900 text-center uppercase tracking-widest">
              View Coverage
            </Link>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
              <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
              <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white"></div>
            </div>
            <span>Trusted by 500+ Establishments</span>
          </div>
        </div>

        {/* Right Column: Interactive Demo */}
        <div className="relative w-full max-w-lg mx-auto lg:ml-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-slate-200 to-[#6b85a3] opacity-20 blur-2xl rounded-sm"></div>
          <div className="relative bg-white border border-slate-200 shadow-2xl rounded-sm overflow-hidden h-[500px] flex flex-col">
            {/* Fake Browser Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
              </div>
              <div className="mx-auto bg-white border border-slate-200 px-3 py-0.5 rounded-sm text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                protocol_lm_system_active
              </div>
            </div>

            {/* Chat Area */}
            <DemoChat scenarios={demoScenarios} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            © 2024 Protocol Systems
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-wider">Terms</Link>
            <Link href="/privacy" className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-wider">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
