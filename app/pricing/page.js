'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Shield, Check } from 'lucide-react';

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async (priceId) => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/auth');
      return;
    }

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });

    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1419', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <Shield size={48} color="#5D4037" style={{ margin: '0 auto 20px' }} />
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', marginBottom: '10px' }}>
            Choose Your Plan
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '18px' }}>
            Access food safety intelligence for your business
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {/* Free Plan */}
          <div style={{
            backgroundColor: '#1a2332',
            border: '2px solid #2d3748',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '10px' }}>
              Free
            </h3>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', marginBottom: '5px' }}>
              $0
            </p>
            <p style={{ color: '#a0aec0', marginBottom: '30px' }}>per month</p>
            
            <ul style={{ textAlign: 'left', marginBottom: '30px', color: '#cbd5e0' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" />
                <span>10 messages per day</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" />
                <span>Basic document access</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" />
                <span>Image analysis</span>
              </li>
            </ul>

            <button
              onClick={() => router.push('/auth')}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#2d3748',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Get Started
            </button>
          </div>

          {/* Pro Plan */}
          <div style={{
            backgroundColor: '#1a2332',
            border: '2px solid #5D4037',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#5D4037',
              color: '#ffffff',
              padding: '5px 20px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              MOST POPULAR
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '10px' }}>
              Pro
            </h3>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', marginBottom: '5px' }}>
              $29
            </p>
            <p style={{ color: '#a0aec0', marginBottom: '30px' }}>per month</p>
            
            <ul style={{ textAlign: 'left', marginBottom: '30px', color: '#cbd5e0' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" />
                <span>Unlimited messages</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" />
                <span>Priority support</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" />
                <span>Advanced analytics</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" />
                <span>Custom reports</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout('price_1SVDccDlSrKA3nbAIRXwrC9F')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#5D4037',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Loading...' : 'Subscribe Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
