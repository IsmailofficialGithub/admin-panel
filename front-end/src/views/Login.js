import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, CloudCog } from 'lucide-react';
import { useHistory } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createClient } from '../lib/supabase/Production/client';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAdmin, profile, loading } = useAuth();
  const history = useHistory();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'admin') {
        history.push('/admin/dashboard');
      } else if (profile.role === 'reseller') {
        history.push('/reseller/dashboard');
      } else if (profile.role === 'consumer') {
        history.push('/consumer/dashboard');
      }
    }
  }, [user, profile, loading, history]);

  const validateForm = () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('❌ Login: Sign in failed:', error);
        toast.error(error.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Fetch user profile to check if admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profileError || !profile?.role) {
          console.error('❌ Login: No profile or role found');
          await supabase.auth.signOut();
          // Clear all tokens and storage
          localStorage.clear();
          sessionStorage.clear();
          // Clear all cookies including Supabase auth cookies
          document.cookie.split(";").forEach((c) => {
            const cookieName = c.split("=")[0].trim();
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
          });
          toast.error('No role assigned to this user.');
          setIsLoading(false);
          return;
        }
        console.log("profile", profile);

        // Check if consumer account is deactivated
        if (profile.role === 'consumer' && profile.account_status === 'deactive') {
          console.error('❌ Login: Consumer account is deactivated');
          await supabase.auth.signOut();
          // Clear all tokens and storage
          localStorage.clear();
          sessionStorage.clear();
          // Clear all cookies including Supabase auth cookies
          document.cookie.split(";").forEach((c) => {
            const cookieName = c.split("=")[0].trim();
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
          });
          toast.error('Your account has been deactivated. Please contact the administrator.');
          setIsLoading(false);
          return;
        }

        // Check if reseller account is deactivated
        if (profile.role === 'reseller' && profile.account_status === 'deactive') {
          console.error('❌ Login: Reseller account is deactivated');
          await supabase.auth.signOut();
          // Clear all tokens and storage
          localStorage.clear();
          sessionStorage.clear();
          // Clear all cookies including Supabase auth cookies
          document.cookie.split(";").forEach((c) => {
            const cookieName = c.split("=")[0].trim();
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
          });
          toast.error('Your account has been deactivated. Please contact the administrator.');
          setIsLoading(false);
          return;
        }

        // Check role and redirect accordingly
        if (profile.role === 'admin') {
          toast.success(`Welcome back, Admin!`);
          
          // Redirect to admin users page
          try {
            setTimeout(() => {
              window.location.href = '/admin/dashboard';
            }, 500);
          } catch (redirectError) {
            console.error('❌ Redirect failed:', redirectError);
          }
        } else if (profile.role === 'reseller') {
          toast.success(`Welcome back, Reseller!`);
          
          // Redirect to resellers page
          try {
            setTimeout(() => {
              window.location.href = '/reseller/dashboard';
            }, 500);
          } catch (redirectError) {
            console.error('❌ Redirect failed:', redirectError);
          }
        } else if (profile.role === 'consumer') {
          toast.success(`Welcome back!`);
          
          // Redirect to consumer page
          try {
            setTimeout(() => {
              window.location.href = '/consumer/dashboard';
            }, 500);
          } catch (redirectError) {
            console.error('❌ Redirect failed:', redirectError);
          }
        } else {
          // Deny access for other roles
          await supabase.auth.signOut();
          // Clear all tokens and storage
          localStorage.clear();
          sessionStorage.clear();
          // Clear all cookies including Supabase auth cookies
          document.cookie.split(";").forEach((c) => {
            const cookieName = c.split("=")[0].trim();
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
          });
          toast.error('Access denied. Invalid user role.');
          setIsLoading(false);
          return;
        }
        
        // Keep loading state true while redirecting
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: '20px'
    }}>
      {/* Login Card */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        width: '100%',
        maxWidth: '450px',
        padding: '50px 40px',
        animation: 'slideUp 0.5s ease-out'
      }}>
        {/* Logo/Title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
          }}>
            <LogIn size={40} color="#ffffff" />
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#1a1a1a',
            margin: '0 0 10px 0'
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6c757d',
            margin: 0
          }}>
            Sign in to access your admin panel
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {/* Email Input */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#495057',
              marginBottom: '8px'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={20}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#adb5bd'
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  fontSize: '15px',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backgroundColor: isLoading ? '#f8f9fa' : '#ffffff',
                  color: '#495057',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#495057',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={20}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#adb5bd'
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 48px',
                  fontSize: '15px',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backgroundColor: isLoading ? '#f8f9fa' : '#ffffff',
                  color: '#495057',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: isLoading ? 0.5 : 1
                }}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#adb5bd" />
                ) : (
                  <Eye size={20} color="#adb5bd" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              background: isLoading 
                ? 'linear-gradient(135deg, #adb5bd 0%, #868e96 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '3px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Footer Text */}
        <div style={{
          marginTop: '30px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          <p style={{ margin: 0 }}>
            Protected by enterprise-grade security
          </p>
        </div>
      </div>

      {/* Animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default Login;

