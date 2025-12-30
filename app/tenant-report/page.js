// app/tenant-report/page.js - Michigan Tenant Condition Report Generator
import TenantReportClient from './page.client'

export const metadata = {
  title: 'Michigan Tenant Condition Report Generator',
  description: 'Generate professional rental condition reports for Michigan tenants - $20 for up to 200 photos',
}

export default function TenantReportPage() {
  return <TenantReportClient />
}
