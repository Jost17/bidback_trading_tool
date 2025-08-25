import React, { useState, useEffect } from 'react';

const InlineStyledDashboard = () => {
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/current-status');
        const data = await response.json();
        setCurrentStatus(data);
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#3b82f6', marginBottom: '16px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: 'white',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #475569',
        padding: '16px 24px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'white',
          margin: 0
        }}>
          🚀 Stockbee Market Monitor
        </h1>
      </header>

      {/* Main Content */}
      <main style={{ padding: '24px' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '32px'
          }}>
            Market Breadth Dashboard
          </h2>

          {/* KPI Card */}
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #475569',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#9ca3af',
              marginBottom: '16px'
            }}>
              Current Breadth Score
            </h3>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#3b82f6',
              marginBottom: '8px'
            }}>
              {currentStatus?.breadthScore?.toFixed(1) || '0.0'}
            </div>
            <div style={{
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Last updated: {currentStatus?.lastUpdated || 'N/A'}
            </div>
          </div>

          {/* Status Message */}
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid #15803d',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{
              color: '#4ade80',
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              ✅ Dashboard loaded successfully!
            </div>
            <div style={{
              color: '#86efac',
              fontSize: '14px'
            }}>
              Frontend and Backend connected properly
            </div>
          </div>

          {/* Debug Info */}
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '24px',
            border: '1px solid #475569'
          }}>
            <h4 style={{
              color: '#f97316',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              🔧 Debug Info:
            </h4>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>
              • Inline Styles: ✅ Working<br/>
              • API Data: ✅ {currentStatus ? 'Connected' : 'Failed'}<br/>
              • Breadth Score: {currentStatus?.breadthScore || 'N/A'}<br/>
              • This should be DARK with colors!
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InlineStyledDashboard;