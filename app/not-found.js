import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1419',
      padding: '16px'
    }}>
      <div style={{
        maxWidth: '400px',
        padding: '32px',
        background: '#1a2332',
        borderRadius: '8px',
        border: '1px solid #2d3748',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: '600',
          color: '#f7fafc',
          marginBottom: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          404
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#a0aec0',
          marginBottom: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          Page not found
        </p>
        <Link href="/" style={{
          display: 'inline-block',
          padding: '10px 20px',
          borderRadius: '6px',
          background: '#f7fafc',
          color: '#0f1419',
          fontSize: '14px',
          fontWeight: '500',
          textDecoration: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          Go home
        </Link>
      </div>
    </div>
  );
}
