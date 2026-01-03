'use client';

import { useState, useEffect } from 'react';
import { HardDrive, FileText, Search, TrendingUp, Calendar, Activity } from 'lucide-react';

interface StorageStats {
  used: number;
  limit: number;
  plan: string;
  percentUsed: number;
  filesCount: number;
  recentUploads: number;
}

interface AnalyticsData {
  totalSearches: number;
  searchesThisMonth: number;
  topSearches: Array<{ query: string; count: number }>;
  uploadTrend: Array<{ date: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number; size: number }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function AnalyticsDashboard() {
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load storage stats
      const storageResponse = await fetch('/api/analytics/storage', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const storageData = await storageResponse.json();
      setStorage(storageData);

      // Load analytics data
      const analyticsResponse = await fetch(`/api/analytics/overview?range=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const analyticsData = await analyticsResponse.json();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading || !storage || !analytics) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Analytics Dashboard</h1>
          <p className="text-text-secondary">Track your document storage and usage</p>
        </div>
        
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-brand text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-elevated'
              }`}
            >
              {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Storage Usage */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-brand" />
            </div>
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Storage
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-text-primary">
                {formatBytes(storage.used)}
              </span>
              <span className="text-sm text-text-tertiary">
                / {storage.limit === Infinity ? '∞' : formatBytes(storage.limit)}
              </span>
            </div>
            <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand h-full rounded-full transition-all"
                style={{ width: `${Math.min(storage.percentUsed, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-tertiary">
              {storage.percentUsed.toFixed(1)}% used • {storage.plan} plan
            </p>
          </div>
        </div>

        {/* Total Documents */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Documents
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-text-primary">{storage.filesCount}</p>
            <p className="text-xs text-text-tertiary">
              +{storage.recentUploads} this week
            </p>
          </div>
        </div>

        {/* Total Searches */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Searches
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-text-primary">{analytics.totalSearches}</p>
            <p className="text-xs text-text-tertiary">
              {analytics.searchesThisMonth} this month
            </p>
          </div>
        </div>

        {/* Activity Score */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Activity
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-text-primary">
              {analytics.recentActivity.length}
            </p>
            <p className="text-xs text-text-tertiary">actions today</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Trend */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">Upload Trend</h3>
            <TrendingUp className="w-5 h-5 text-brand" />
          </div>
          <div className="space-y-2">
            {analytics.uploadTrend.map((day, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-text-tertiary w-24">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 bg-surface-elevated rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-brand h-full rounded-full transition-all flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.max((day.count / Math.max(...analytics.uploadTrend.map(d => d.count))) * 100, 5)}%`
                    }}
                  >
                    <span className="text-xs font-medium text-white">{day.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">Category Breakdown</h3>
            <FileText className="w-5 h-5 text-brand" />
          </div>
          <div className="space-y-4">
            {analytics.categoryBreakdown.map((cat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary capitalize">
                    {cat.category || 'Uncategorized'}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text-primary">{cat.count} files</p>
                    <p className="text-xs text-text-tertiary">{formatBytes(cat.size)}</p>
                  </div>
                </div>
                <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand h-full rounded-full transition-all"
                    style={{
                      width: `${(cat.count / storage.filesCount) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Searches & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Searches */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Top Searches</h3>
          <div className="space-y-3">
            {analytics.topSearches.slice(0, 5).map((search, idx) => (
              <div key={idx} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs font-medium text-text-tertiary w-6">#{idx + 1}</span>
                  <p className="text-sm text-text-primary truncate flex-1">{search.query}</p>
                </div>
                <span className="text-xs font-semibold text-brand bg-brand/10 px-2 py-1 rounded-md">
                  {search.count}x
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {analytics.recentActivity.slice(0, 5).map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 py-2">
                <div className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">{activity.description}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
