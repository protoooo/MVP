'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, DollarSign, Clock, CheckCircle, Plus } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total: number;
  currency: string;
  due_date: string;
  created_at: string;
  item_count: number;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    paidCount: 0,
    pendingCount: 0,
  });

  useEffect(() => {
    loadInvoices();
  }, [filter]);

  const loadInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const url = filter
        ? `${API_URL}/api/invoices?status=${filter}`
        : `${API_URL}/api/invoices`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load invoices');

      const data = await response.json();
      setInvoices(data.invoices || []);

      // Calculate stats
      const totalRevenue = data.invoices
        .filter((inv: Invoice) => inv.status === 'paid')
        .reduce((sum: number, inv: Invoice) => sum + parseFloat(inv.total.toString()), 0);

      const pendingAmount = data.invoices
        .filter((inv: Invoice) => inv.status === 'pending')
        .reduce((sum: number, inv: Invoice) => sum + parseFloat(inv.total.toString()), 0);

      const paidCount = data.invoices.filter((inv: Invoice) => inv.status === 'paid').length;
      const pendingCount = data.invoices.filter((inv: Invoice) => inv.status === 'pending').length;

      setStats({ totalRevenue, pendingAmount, paidCount, pendingCount });
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-600/20 text-emerald-400 border-emerald-600/50';
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50';
      case 'draft':
        return 'bg-gray-600/20 text-gray-400 border-gray-600/50';
      case 'cancelled':
        return 'bg-red-600/20 text-red-400 border-red-600/50';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} />;
      case 'pending':
        return <Clock size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Invoices</h1>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
              <Plus size={20} />
              New Invoice
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <DollarSign size={16} />
                Total Revenue
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {formatCurrency(stats.totalRevenue)}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Clock size={16} />
                Pending
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                {formatCurrency(stats.pendingAmount)}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <CheckCircle size={16} />
                Paid Invoices
              </div>
              <div className="text-2xl font-bold">{stats.paidCount}</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <FileText size={16} />
                Pending Invoices
              </div>
              <div className="text-2xl font-bold">{stats.pendingCount}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setFilter('')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === ''
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'draft'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'pending'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'paid'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Paid
            </button>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No invoices found. Create your first invoice!
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:bg-gray-850 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-gray-400">
                        {invoice.invoice_number}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {getStatusIcon(invoice.status)}
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                    <div className="font-medium mb-1">{invoice.customer_name}</div>
                    <div className="text-sm text-gray-500">{invoice.customer_email}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold mb-1">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {invoice.due_date && `Due ${formatDate(invoice.due_date)}`}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {invoice.item_count} item{invoice.item_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
