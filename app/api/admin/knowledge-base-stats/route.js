// app/api/admin/knowledge-base-stats/route.js
// Admin endpoint for monitoring knowledge base costs and conversions
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Estimated costs (in USD)
const COSTS = {
  EMBED_PER_1K_TOKENS: 0.00001, // $0.01 per 1M tokens
  SEARCH_OVERHEAD: 0.0001, // Database query overhead
  RERANK_PER_SEARCH: 0.002, // ~$0.002 per rerank
  VISION_PER_IMAGE: 0.005 // ~$0.005 per image analysis
}

export async function GET(request) {
  try {
    // Simple auth check (use proper admin auth in production)
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_API_KEY
    
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const last7Days = new Date(today)
    last7Days.setDate(last7Days.getDate() - 7)
    const last30Days = new Date(today)
    last30Days.setDate(last30Days.getDate() - 30)

    // Get search stats
    const { data: todaySearches, error: searchTodayError } = await supabase
      .from('knowledge_base_queries')
      .select('*', { count: 'exact' })
      .gte('timestamp', today.toISOString())

    const { data: weekSearches, error: searchWeekError } = await supabase
      .from('knowledge_base_queries')
      .select('*', { count: 'exact' })
      .gte('timestamp', last7Days.toISOString())

    const { data: monthSearches, error: searchMonthError } = await supabase
      .from('knowledge_base_queries')
      .select('*', { count: 'exact' })
      .gte('timestamp', last30Days.toISOString())

    // Get image analysis stats
    const { data: todayImages, error: imageTodayError } = await supabase
      .from('free_image_analyses')
      .select('*', { count: 'exact' })
      .gte('timestamp', today.toISOString())

    const { data: weekImages, error: imageWeekError } = await supabase
      .from('free_image_analyses')
      .select('*', { count: 'exact' })
      .gte('timestamp', last7Days.toISOString())

    const { data: monthImages, error: imageMonthError } = await supabase
      .from('free_image_analyses')
      .select('*', { count: 'exact' })
      .gte('timestamp', last30Days.toISOString())

    // Calculate estimated costs
    const todaySearchCount = todaySearches?.length || 0
    const weekSearchCount = weekSearches?.length || 0
    const monthSearchCount = monthSearches?.length || 0
    
    const todayImageCount = todayImages?.length || 0
    const weekImageCount = weekImages?.length || 0
    const monthImageCount = monthImages?.length || 0

    const todayCost = 
      (todaySearchCount * (COSTS.SEARCH_OVERHEAD + COSTS.RERANK_PER_SEARCH)) +
      (todayImageCount * COSTS.VISION_PER_IMAGE)
    
    const weekCost = 
      (weekSearchCount * (COSTS.SEARCH_OVERHEAD + COSTS.RERANK_PER_SEARCH)) +
      (weekImageCount * COSTS.VISION_PER_IMAGE)
    
    const monthCost = 
      (monthSearchCount * (COSTS.SEARCH_OVERHEAD + COSTS.RERANK_PER_SEARCH)) +
      (monthImageCount * COSTS.VISION_PER_IMAGE)

    // Get unique users
    const uniqueSearchEmails = new Set()
    weekSearches?.forEach(s => {
      if (s.ip_address) uniqueSearchEmails.add(s.ip_address)
    })

    const uniqueImageEmails = new Set()
    weekImages?.forEach(i => {
      if (i.email) uniqueImageEmails.add(i.email)
    })

    // Get top queries
    const queryCount = {}
    monthSearches?.forEach(s => {
      const q = s.query
      queryCount[q] = (queryCount[q] || 0) + 1
    })
    const topQueries = Object.entries(queryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }))

    const stats = {
      costs: {
        today: todayCost.toFixed(4),
        week: weekCost.toFixed(4),
        month: monthCost.toFixed(4),
        dailyLimit: 5.00,
        alertThreshold: todayCost > 5.00
      },
      searches: {
        today: todaySearchCount,
        week: weekSearchCount,
        month: monthSearchCount,
        uniqueUsersWeek: uniqueSearchEmails.size
      },
      images: {
        today: todayImageCount,
        week: weekImageCount,
        month: monthImageCount,
        uniqueUsersWeek: uniqueImageEmails.size
      },
      topQueries,
      conversionFunnel: {
        searchToImageUpload: uniqueImageEmails.size > 0 
          ? ((uniqueImageEmails.size / Math.max(uniqueSearchEmails.size, 1)) * 100).toFixed(1) + '%'
          : '0%',
        // Would need to track actual conversions to video purchase
        imageUploadToVideoPurchase: 'Track via Stripe webhooks'
      }
    }

    // Alert if daily costs exceed threshold
    if (stats.costs.alertThreshold) {
      logger.warn('Knowledge base daily cost threshold exceeded', {
        cost: todayCost,
        searches: todaySearchCount,
        images: todayImageCount
      })
    }

    return NextResponse.json(stats)

  } catch (error) {
    logger.error('Knowledge base stats error', { error: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Failed to retrieve stats' }, { status: 500 })
  }
}
