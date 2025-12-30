// app/tenant-report/success/page.js
import SuccessPageClient from './page.client'

export const metadata = {
  title: 'Report Generating - Michigan Tenant Report',
  description: 'Your tenant condition report is being generated',
}

export default function SuccessPage() {
  return <SuccessPageClient />
}
