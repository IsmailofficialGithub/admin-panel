import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ component: Component, ...rest }) => {
  const { user, isAdmin, loading } = useAuth();

  console.log('🔒 ProtectedRoute: Checking auth...', { user: !!user, isAdmin, loading });

  // Show loading while checking authentication
  if (loading) {
    // Add spinner animation
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    if (!document.head.querySelector('style[data-spinner]')) {
      styleTag.setAttribute('data-spinner', 'true');
      document.head.appendChild(styleTag);
    }

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '5px solid rgba(255,255,255,0.3)',
            borderTop: '5px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or not admin, redirect to login
  if (!user || !isAdmin) {
    console.log('❌ ProtectedRoute: Access denied, redirecting to login');
    return <Redirect to="/login" />;
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <Route {...rest} render={(props) => <Component {...props} />} />;
};

export default ProtectedRoute;
