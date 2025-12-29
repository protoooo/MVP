// New simplified landing page for payment-based food safety app (no authentication)
import SimpleLanding from './page.client'

export const metadata = {
  title: 'Michigan Food Safety Photo Analysis - $50 Reports & API Access',
  description: 'Upload restaurant photos, get instant Michigan health code compliance reports. No signup required. $50 per report or buy API access.',
}

export default function SimpleHomePage() {
  return <SimpleLanding />
}
