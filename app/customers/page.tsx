'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Mail, FileText, DollarSign, Plus, Building } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Customer {
  id: number;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  invoice_count: number;
  total_revenue: number;
  interaction_count: number;
  created_at: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load customers');

      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce(
    (sum, customer) => sum + parseFloat(customer.total_revenue.toString()),
    0
  );
  const avgRevenue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Customer Hub</h1>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
              <Plus size={20} />
              Add Customer
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Users size={16} />
                Total Customers
              </div>
              <div className="text-2xl font-bold">{totalCustomers}</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <DollarSign size={16} />
                Total Revenue
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {formatCurrency(totalRevenue)}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <DollarSign size={16} />
                Avg Revenue/Customer
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {formatCurrency(avgRevenue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No customers yet. Add your first customer!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:bg-gray-850 transition-all cursor-pointer group"
              >
                {/* Avatar & Name */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center font-bold text-white">
                    {getInitials(customer.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors truncate">
                      {customer.name}
                    </h3>
                    {customer.company && (
                      <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                        <Building size={14} />
                        <span className="truncate">{customer.company}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Mail size={14} />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  {customer.phone && (
                    <div className="text-gray-500 pl-5">{customer.phone}</div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-800">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <FileText size={12} />
                      Invoices
                    </div>
                    <div className="font-medium">{customer.invoice_count}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <DollarSign size={12} />
                      Revenue
                    </div>
                    <div className="font-medium text-emerald-400">
                      {formatCurrency(parseFloat(customer.total_revenue.toString()))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-xs text-gray-600 mt-4 pt-3 border-t border-gray-800">
                  Customer since {formatDate(customer.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
