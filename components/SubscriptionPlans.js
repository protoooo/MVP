'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { PLANS } from '../lib/stripe';

export default function SubscriptionPlans({ currentPlan = 'free', onUpgrade }) {
  const [loading, setLoading] = useState(null);

  const handleUpgrade = async (planType) => {
    if (planType === 'FREE') return;
    
    setLoading(planType);
    try {
      const plan = PLANS[planType];
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          planType: planType
        })
      });

      const { url, error } = await response.json();
      
      if (error) throw new Error(error);
      if (url) window.location.href = url;
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start upgrade process');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
      marginTop: '24px'
    }}>
      {Object.entries(PLANS).map(([key, plan]) => {
        const isCurrent = currentPlan.toUpperCase() === key;
        
        return (
          <div
            key={key}
            style={{
              background: '#0f1419',
              border: isCurrent ? '2px solid #48bb78' : '1px solid #2d3748',
              borderRadius: '8px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {isCurrent && (
              <div style={{
                background: '#48bb78',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '16px',
                width: 'fit-content',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                CURRENT PLAN
              </div>
            )}
            
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#f7fafc',
              marginBottom: '8px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              {plan.name}
            </h3>
            
            <div style={{ marginBottom: '24px' }}>
              <span style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#f7fafc',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                ${plan.price}
              </span>
              <span style={{
                fontSize: '14px',
                color: '#a0aec0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                /month
              </span>
            </div>
            
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 24px 0',
              flex: 1
            }}>
              {plan.features.map((feature, idx) => (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: '#e2e8f0',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  <Check size={16} style={{ color: '#48bb78', flexShrink: 0, marginTop: '2px' }} />
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleUpgrade(key)}
              disabled={isCurrent || loading === key || key === 'FREE'}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: (isCurrent || key === 'FREE') ? 'not-allowed' : 'pointer',
                background: isCurrent ? '#2d3748' : '#f7fafc',
                color: isCurrent ? '#a0aec0' : '#0f1419',
                fontSize: '14px',
                fontWeight: '500',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                opacity: (isCurrent || loading === key) ? 0.5 : 1
              }}
            >
              {loading === key ? 'Loading...' : isCurrent ? 'Current Plan' : key === 'FREE' ? 'Free Forever' : 'Upgrade'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
