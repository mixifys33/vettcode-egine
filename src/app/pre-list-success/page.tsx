'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function PreListSuccessContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState({
    projectName: '',
    vettScore: 0,
    vettGrade: '',
    email: ''
  });

  useEffect(() => {
    setData({
      projectName: searchParams.get('projectName') || 'Your Project',
      vettScore: parseFloat(searchParams.get('vettScore') || '0'),
      vettGrade: searchParams.get('vettGrade') || 'N/A',
      email: searchParams.get('email') || ''
    });
  }, [searchParams]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(34, 211, 165, 0.1) 0%, rgba(91, 124, 250, 0.1) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '42rem',
        width: '100%',
        background: 'var(--surface)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow)',
        padding: '2rem',
        border: '1px solid var(--border)'
      }}>
        {/* Success Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, var(--accent), #14b88a)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem'
          }}>
            ✓
          </div>
        </div>

        {/* Main Message */}
        <h1 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '1rem',
          background: 'linear-gradient(90deg, var(--accent), var(--primary))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent'
        }}>
          🎉 Excellent!
        </h1>

        <p style={{
          fontSize: '1.1rem',
          textAlign: 'center',
          color: 'var(--text)',
          marginBottom: '2rem'
        }}>
          Your codebase <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{data.projectName}</span> has been:
        </p>

        {/* Status Badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'rgba(34, 211, 165, 0.1)',
            border: '2px solid var(--accent)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              ✓ AUDITED
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)' }}>
              {data.vettGrade}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Score: {data.vettScore}/100
            </div>
          </div>

          <div style={{
            background: 'rgba(91, 124, 250, 0.1)',
            border: '2px solid var(--primary)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              ✓ CERTIFIED
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              VETT
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Security Verified
            </div>
          </div>

          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '2px solid #a855f7',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#a855f7', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              ✓ PRE-LISTED
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#a855f7' }}>
              READY
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              In Inventory
            </div>
          </div>
        </div>

        {/* Key Message */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), #a855f7)',
          color: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Your Developer Profile is Now Active
          </h2>
          <p style={{ lineHeight: 1.6, opacity: 0.95 }}>
            Your code is safely stored in the <span style={{ fontWeight: 600 }}>VETTCODE Pre-Launch Inventory</span>.
            We will email you at <span style={{ fontWeight: 600 }}>{data.email}</span> the exact moment the
            public corporate buyer platform goes live so you can set your price.
          </p>
        </div>

        {/* What Happens Next */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            What Happens Next?
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              { icon: '✓', color: 'var(--accent)', text: 'Your code is securely stored and ready for the marketplace launch' },
              { icon: '📧', color: 'var(--primary)', text: "You'll receive an email when the corporate buyer platform launches" },
              { icon: '💰', color: '#a855f7', text: 'You can then set your price and start earning from your code' },
              { icon: '🚀', color: 'var(--warning)', text: 'Early pre-listers get priority placement and exclusive badges' }
            ].map((item, idx) => (
              <li key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                marginBottom: '0.75rem'
              }}>
                <span style={{ color: item.color, fontSize: '1.25rem', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ color: 'var(--text)', fontSize: '0.95rem' }}>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}>
          <a
            href="/"
            className="btn btn-primary"
            style={{
              width: '100%',
              textDecoration: 'none',
              textAlign: 'center'
            }}
          >
            Scan Another Project
          </a>
          <a
            href="https://vettcodedev.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{
              width: '100%',
              textDecoration: 'none',
              textAlign: 'center'
            }}
          >
            View My Dashboard →
          </a>
        </div>

        {/* Footer Note */}
        <p style={{
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--muted)'
        }}>
          Questions? Email us at{' '}
          <a href="mailto:support@vettcode.com" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
            support@vettcode.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function PreListSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'var(--muted)' }}>Loading...</div>
      </div>
    }>
      <PreListSuccessContent />
    </Suspense>
  );
}
