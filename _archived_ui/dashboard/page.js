// Dashboard - Usage stats, billing, webhook instructions, API keys
import DashboardClient from './page.client'

export const metadata = {
  title: 'Dashboard - ProtocolLM',
  description: 'View your usage stats, manage API keys, and access webhook integration instructions',
}

export default function DashboardPage() {
  return <DashboardClient />
}
