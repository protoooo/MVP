"use client";

import { useState } from "react";
import { 
  Calendar, 
  Mail, 
  Receipt, 
  FileText, 
  Clock, 
  Check, 
  X, 
  ArrowRight,
  Users,
  Package,
  TrendingUp,
  Star,
  MapPin,
  Shield,
  DollarSign,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const [hourlyRate, setHourlyRate] = useState(50);

  const monthlyValue = (hourlyRate * 10 * 4.33).toFixed(0);
  const monthlySavings = (parseFloat(monthlyValue) - 25).toFixed(0);
  const hoursToROI = Math.ceil(25 / hourlyRate);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Stop Doing Paperwork.<br/>
              Start Doing Business.
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The workspace that actually completes your admin tasks — schedules, invoices, emails, reports — so you can focus on customers.
            </p>
            
            <div className="flex items-center justify-center gap-2 text-indigo-600 text-lg font-semibold mb-8">
              <Clock className="w-6 h-6" />
              <span>Save 10+ hours per week on admin work</span>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mb-10">
              {['Bakery Owners', 'Contractors', 'Freelancers', 'Restaurant Owners', 'Solo Business Owners', 'Small Teams (2-10 people)'].map(tag => (
                <span key={tag} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link 
                href="/signup"
                className="px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
              >
                Start Free - No Credit Card
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button
                className="px-8 py-4 border border-gray-300 text-gray-700 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Watch Demo (90 sec)
              </button>
            </div>

            <blockquote className="text-gray-600 italic max-w-2xl mx-auto">
              "I used to spend 6 hours every Sunday doing schedules. Now it takes 5 minutes." 
              <span className="block text-sm text-gray-500 mt-2">— Maria, Bakery Owner</span>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            What's Eating Your Time?
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {[
              {
                problem: "Spend 4 hours every week making the schedule",
                context: "Juggling availability, preferences, shift coverage...",
                solution: "5 minutes. Upload your team list, click 'Generate Schedule'",
                timeSaved: "Save 3h 55min/week"
              },
              {
                problem: "Writing the same customer emails over and over",
                context: "Quotes, confirmations, follow-ups, apologies...",
                solution: "Type what you need, get a perfect email in 10 seconds",
                timeSaved: "Save 5+ hours/week"
              },
              {
                problem: "Creating invoices one by one in Excel",
                context: "Calculating totals, formatting, emailing...",
                solution: "Click 'New Invoice', fill 3 fields, download PDF",
                timeSaved: "Save 2+ hours/week"
              },
              {
                problem: "Digging through receipts for expense reports",
                context: "Categorizing, adding up, creating spreadsheets...",
                solution: "Photo receipts, auto-extract data, generate report",
                timeSaved: "Save 3+ hours/month"
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="mb-4">
                  <div className="flex items-start gap-3 mb-2">
                    <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">{item.problem}</p>
                      <p className="text-sm text-gray-600 mt-1">{item.context}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center my-4">
                  <ArrowRight className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">{item.solution}</p>
                      <p className="text-sm font-medium text-indigo-600 mt-2">{item.timeSaved}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center bg-indigo-600 text-white rounded-xl p-8">
            <div className="text-6xl font-bold mb-2">14+ hours</div>
            <div className="text-xl mb-2">saved per week on average</div>
            <div className="text-indigo-200">That's almost 2 full workdays back</div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <MapPin className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="font-semibold text-gray-900">Used by 2,400+ small businesses</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Star className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="font-semibold text-gray-900">4.9/5 stars (890 reviews)</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Shield className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="font-semibold text-gray-900">Bank-level security</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">60-Day Money-Back Guarantee</h3>
            <p className="text-gray-700 max-w-2xl mx-auto">
              If you don't save at least 10 hours per month, we'll refund every penny. No questions asked.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            One Price. Everything Included.
          </h2>
          <p className="text-xl text-center text-gray-600 mb-12">
            No per-user fees. No feature tiers. No surprises.
          </p>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Business Plan</h3>
              <div className="flex items-baseline justify-center gap-2 mb-4">
                <span className="text-6xl font-bold text-gray-900">$25</span>
                <span className="text-2xl text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">
                For solo entrepreneurs, contractors, and small teams (up to 10 people)
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                'Unlimited pages & databases',
                'All 250+ automation features',
                'Unlimited schedules, invoices, emails, reports',
                'Up to 10 team members',
                'Mobile app included',
                'Email support'
              ].map(feature => (
                <div key={feature} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 rounded-lg p-6 mb-8">
              <h4 className="font-semibold text-gray-900 mb-4">Your ROI:</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Time saved per week:</span>
                  <span className="font-semibold text-gray-900">10+ hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Your hourly rate:</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-1 border border-gray-300 rounded text-right font-semibold"
                  />
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Value per month:</span>
                  <span className="font-semibold text-gray-900">${monthlyValue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Cost per month:</span>
                  <span className="font-semibold text-gray-900">$25</span>
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold text-gray-900">You save:</span>
                  <span className="font-bold text-green-600">${monthlySavings}/month</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center">
                At ${hourlyRate}/hour, this pays for itself in {hoursToROI} {hoursToROI === 1 ? 'hour' : 'hours'} of saved time
              </p>
            </div>

            <Link
              href="/signup"
              className="w-full block text-center px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors mb-2"
            >
              Start 14-Day Free Trial
            </Link>
            <p className="text-center text-sm text-gray-600">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Real People. Real Time Saved.
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "I used to spend every Sunday night doing the schedule. Now I do it Monday morning in 5 minutes while my coffee brews.",
                name: "Maria Rodriguez",
                business: "Owner, Sweet Dreams Bakery",
                location: "Austin, TX",
                timeSaved: "3h 45m saved per week",
                value: "16 hours saved per month"
              },
              {
                quote: "As a solo contractor, I was drowning in paperwork. Now my estimates look professional, my invoices go out on time, and I have time to actually do the work I love.",
                name: "James Chen",
                business: "General Contractor",
                location: "Portland, OR",
                timeSaved: "10+ hours saved per week",
                value: "$2,400 extra revenue/month"
              },
              {
                quote: "I'm a freelance designer running my own studio. This handles all my admin so I can focus on creative work. Client communication, invoicing, project tracking—it's all automatic.",
                name: "Sarah Williams",
                business: "Freelance Designer",
                location: "Brooklyn, NY",
                timeSaved: "12 hours saved per week",
                value: "3 more clients capacity"
              }
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 italic mb-6">"{testimonial.quote}"</p>
                <div className="mb-4">
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.business}</p>
                  <p className="text-sm text-gray-500">{testimonial.location}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-2xl font-bold text-indigo-600">{testimonial.timeSaved.split(' ')[0]}</p>
                    <p className="text-xs text-gray-600">{testimonial.timeSaved.split(' ').slice(1).join(' ')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-indigo-600">{testimonial.value.split(' ')[0]}</p>
                    <p className="text-xs text-gray-600">{testimonial.value.split(' ').slice(1).join(' ')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            Why Business Owners Choose Us
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            We don't just organize your work — we actually complete it for you
          </p>

          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900"></th>
                  <th className="px-6 py-4 text-center bg-indigo-50">
                    <div className="font-bold text-indigo-900 text-lg mb-1">Business Workspace</div>
                    <div className="text-xs text-indigo-600 font-normal">✓ Built for small business</div>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <div className="font-semibold text-gray-900">Notion</div>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <div className="font-semibold text-gray-900">Asana/Monday</div>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <div className="font-semibold text-gray-900">Hiring an Admin</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Actually completes work</td>
                  <td className="px-6 py-4 text-center bg-indigo-50">
                    <Check className="w-5 h-5 text-green-600 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Check className="w-5 h-5 text-green-600 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Creates schedules, invoices, emails</td>
                  <td className="px-6 py-4 text-center bg-indigo-50">
                    <Check className="w-5 h-5 text-green-600 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-xs text-gray-500">(You do it manually)</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-xs text-gray-500">(You do it manually)</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Check className="w-5 h-5 text-green-600 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Monthly cost</td>
                  <td className="px-6 py-4 text-center bg-indigo-50">
                    <div className="text-lg font-bold text-indigo-600">$25</div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">$10-15/user</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">$10-25/user</td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-lg font-bold text-gray-900">$2,000+</div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Setup time</td>
                  <td className="px-6 py-4 text-center bg-indigo-50 text-sm font-semibold text-indigo-700">5 minutes</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Hours of configuration</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Hours of configuration</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Weeks to hire/train</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Learning curve</td>
                  <td className="px-6 py-4 text-center bg-indigo-50 text-sm font-semibold text-indigo-700">Pick task → Done</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Steep learning curve</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Steep learning curve</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Depends on person</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Best for</td>
                  <td className="px-6 py-4 text-center bg-indigo-50">
                    <div className="text-sm font-bold text-indigo-900">Solo to 10 people</div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Tech-savvy teams</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Project management</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">20+ employees</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-center mt-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Ready to get your time back?
            </h3>
            <Link
              href="/signup"
              className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors mb-3"
            >
              Start Free Trial
            </Link>
            <p className="text-sm text-gray-600">No credit card required. Cancel anytime.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to get your time back?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join 2,400+ business owners saving 10+ hours per week
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-indigo-600 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors mb-4"
          >
            Start Free Trial
          </Link>
          <p className="text-indigo-200">No credit card required. Cancel anytime.</p>
        </div>
      </section>
    </div>
  );
}
