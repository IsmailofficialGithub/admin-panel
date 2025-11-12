import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Lock, ArrowLeft, CheckCircle, XCircle, Loader } from 'lucide-react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import apiClient from '../services/apiClient';
import { decryptPaymentData } from '../utils/encryption';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

// Payment form component using Stripe Elements
const PaymentForm = ({
  amount,
  invoiceNumber,
  encryptedData,
  onSuccess,
  onError,
  clientSecret
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(value) || 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        console.error('[fail] Payment form validation error:', submitError);
        toast.error(submitError.message || 'Please review your payment details and try again.');
        if (onError) {
          onError(submitError);
        }
        setIsProcessing(false);
        return;
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        console.error('[fail] Stripe payment error:', stripeError);
        toast.error(stripeError.message || 'Payment failed');
        if (onError) {
          onError(stripeError);
        }
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('[success] Payment succeeded:', {
          paymentIntentId: paymentIntent.id,
          invoiceNumber,
          amount
        });

        try {
          const confirmResponse = await apiClient.stripe.confirmPayment(paymentIntent.id, encryptedData);

          if (confirmResponse && confirmResponse.success) {
            console.log('[success] Payment confirmed on backend');
            toast.success('Payment successful!');
            if (onSuccess) {
              onSuccess(paymentIntent);
            }
            setIsProcessing(false);
            return;
          }

          throw new Error(confirmResponse?.message || 'Failed to confirm payment');
        } catch (confirmError) {
          console.error('[fail] Error confirming payment:', confirmError);
          if (paymentIntent.status === 'succeeded') {
            console.warn('[warning] Payment succeeded on Stripe but backend confirmation had issues');
            toast.success('Payment successful!');
            if (onSuccess) {
              onSuccess(paymentIntent);
            }
            setIsProcessing(false);
            return;
          }
          toast.error('Payment succeeded but confirmation failed. Please contact support.');
          if (onError) {
            onError(confirmError);
          }
        }
      } else {
        const status = paymentIntent?.status || 'unknown';
        console.log('[fail] Payment failed with status:', status);
        toast.error(`Payment failed: ${status}`);
        if (onError) {
          onError(new Error(`Payment status: ${status}`));
        }
      }
    } catch (error) {
      console.error('[fail] Payment error:', error);
      toast.error(error.message || 'Payment failed');
      if (onError) {
        onError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#495057'
        }}>
          Payment Method
        </label>
        <div style={{
          padding: '16px',
          border: '2px solid #e0e0e0',
          borderRadius: '10px',
          backgroundColor: 'white',
          transition: 'all 0.2s'
        }}>
          <PaymentElement id="payment-element" options={{ layout: 'accordion' }} />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isProcessing || !stripe || !clientSecret}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: isProcessing || !stripe || !clientSecret ? '#9ca3af' : '#74317e',
          border: 'none',
          borderRadius: '10px',
          color: 'white',
          fontSize: '18px',
          fontWeight: '600',
          cursor: isProcessing || !stripe || !clientSecret ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: isProcessing || !stripe || !clientSecret ? 'none' : '0 4px 15px rgba(116, 49, 126, 0.4)'
        }}
        onMouseEnter={(e) => {
          if (!isProcessing && stripe && clientSecret) {
            e.target.style.backgroundColor = '#5a2460';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(116, 49, 126, 0.6)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isProcessing && stripe && clientSecret) {
            e.target.style.backgroundColor = '#74317e';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(116, 49, 126, 0.4)';
          }
        }}
      >
        {isProcessing ? (
          <>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
            Processing...
          </>
        ) : (
          <>
            <Lock size={20} />
            Pay {formatCurrency(amount)}
          </>
        )}
      </Button>
    </form>
  );
};

// Main Payment component
const Payment = () => {
  const location = useLocation();
  const history = useHistory();
  const [paymentData, setPaymentData] = useState(null);
  const [encryptedData, setEncryptedData] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceStatus, setInvoiceStatus] = useState(null);
  const [isAlreadyPaid, setIsAlreadyPaid] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);

  const createPaymentIntent = useCallback(async (payload) => {
    if (!payload) return false;

    try {
      const response = await apiClient.stripe.createPaymentIntent(payload);

      if (response && response.success) {
        setClientSecret(response.clientSecret);
        setError(null);
        return true;
      }

      if (response && response.error === 'Bad Request' && response.message === 'Invoice is already paid') {
        setIsAlreadyPaid(true);
        setInvoiceStatus('paid');
        toast.info('This invoice has already been paid');
        return false;
      }

      throw new Error(response?.message || response?.error || 'Failed to create payment intent');
    } catch (error) {
      console.error('[fail] Error creating payment intent:', error);
      const errorMessage = error.message || '';

      if (errorMessage.includes('Invoice is already paid') || errorMessage.includes('already paid')) {
        setIsAlreadyPaid(true);
        setInvoiceStatus('paid');
        toast.info('This invoice has already been paid');
        return false;
      }

      toast.error(errorMessage || 'Failed to initialize payment');
      setError(errorMessage || 'Failed to initialize payment');
      return false;
    }
  }, []);

  const checkInvoiceStatus = useCallback(async (invoiceId) => {
    if (!invoiceId) return null;

    try {
      const response = await apiClient.invoices.getInvoicePayments(invoiceId);

      if (response && response.data && Array.isArray(response.data)) {
        const hasApprovedPayment = response.data.some((payment) => payment.status === 'approved');
        if (hasApprovedPayment) {
          setIsAlreadyPaid(true);
          setInvoiceStatus('paid');
          return 'paid';
        }
      }

      setInvoiceStatus('unpaid');
      return 'unpaid';
    } catch (error) {
      console.log('Invoice status check skipped (may require auth):', error.message);
      setInvoiceStatus(null);
      return null;
    }
  }, []);

  const paymentElementAppearance = useMemo(() => ({
    theme: 'stripe',
    variables: {
      colorPrimary: '#74317e',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }
  }), []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(value) || 0);
  };

  useEffect(() => {
    const initializePayment = async () => {
      setShowSuccess(false);
      setError(null);
      setClientSecret(null);
      setIsAlreadyPaid(false);
      setInvoiceStatus(null);
      setPaymentData(null);
      setEncryptedData(null);

      try {
        setLoading(true);

        const searchParams = new URLSearchParams(location.search);
        const encryptedQueryData = searchParams.get('data');
        const amount = searchParams.get('amount');
        const invoiceId = searchParams.get('invoice_id');
        const userId = searchParams.get('user_id');
        const invoiceNumber = searchParams.get('invoice_number');

        if (encryptedQueryData) {
          try {
            const decrypted = decryptPaymentData(encryptedQueryData);
            setPaymentData(decrypted);
            setEncryptedData(encryptedQueryData);

            const status = await checkInvoiceStatus(decrypted.invoice_id);
            if (status !== 'paid') {
              await createPaymentIntent(encryptedQueryData);
            }

            setLoading(false);
            return;
          } catch (decryptError) {
            console.error('Decryption error:', decryptError);
            toast.error('Invalid payment link');
            setError('Invalid payment link');
            setLoading(false);
            return;
          }
        }

        if (amount && invoiceId && userId && invoiceNumber) {
          const data = {
            amount,
            invoice_id: invoiceId,
            user_id: userId,
            invoice_number: invoiceNumber
          };
          setPaymentData(data);

          let encryptedPayload;
          try {
            const { encryptPaymentData } = await import('../utils/encryption');
            encryptedPayload = encryptPaymentData(data);
          } catch (encryptError) {
            console.error('Encryption error:', encryptError);
            encryptedPayload = JSON.stringify(data);
          }

          setEncryptedData(encryptedPayload);

          const status = await checkInvoiceStatus(invoiceId);
          if (status !== 'paid') {
            await createPaymentIntent(encryptedPayload);
          }

          setLoading(false);
          return;
        }

        toast.error('Invalid payment parameters');
        setError('Invalid payment parameters');
        setLoading(false);
      } catch (err) {
        console.error('Error initializing payment:', err);
        setError('Failed to initialize payment');
        setLoading(false);
      }
    };

    initializePayment().catch((err) => {
      console.error('Error initializing payment:', err);
      setError('Failed to initialize payment');
      setLoading(false);
    });
  }, [location.search, createPaymentIntent, checkInvoiceStatus]);

  const handleSuccess = (paymentIntent) => {
    console.log('[success] Payment completed successfully');
    setShowSuccess(true);
  };

  const handleError = (error) => {
    console.error('[fail] Payment error:', error);
    setError(error.message || 'Payment failed');
  };

  if (loading) {
    return (
      <Container fluid style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <Loader size={48} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p style={{ fontSize: '18px', margin: 0 }}>Loading payment...</p>
        </div>
      </Container>
    );
  }

  // Show "already paid" message if invoice is already paid
  if (isAlreadyPaid && paymentData) {
    return (
      <Container fluid style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <Card style={{ 
          maxWidth: '500px', 
          width: '100%',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
          padding: '40px'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              animation: 'scaleIn 0.5s ease-out'
            }}>
              <CheckCircle size={40} color="white" />
            </div>
            <h2 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '28px', 
              fontWeight: '700',
              color: '#111827'
            }}>
              Invoice Already Paid
            </h2>
            <p style={{ 
              margin: '0 0 32px 0', 
              fontSize: '16px', 
              color: '#6b7280',
              lineHeight: '1.6'
            }}>
              This invoice has already been paid. No further payment is required.
            </p>
            <div style={{
              padding: '20px',
              backgroundColor: '#f3f4f6',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                Invoice Number
              </p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                {paymentData?.invoice_number || 'N/A'}
              </p>
              <p style={{ margin: '16px 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                Amount
              </p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#74317e' }}>
                {formatCurrency(paymentData?.amount || 0)}
              </p>
            </div>
            <Button
              onClick={() => history.push('/login')}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#74317e',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#5a2460';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(116, 49, 126, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#74317e';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Return Home
            </Button>
          </div>
        </Card>
        <style>
          {`
            @keyframes scaleIn {
              0% { transform: scale(0); opacity: 0; }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); opacity: 1; }
            }
          `}
        </style>
      </Container>
    );
  }

  if (error && !paymentData) {
    return (
      <Container fluid style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <Card style={{ 
          maxWidth: '500px', 
          width: '100%',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
          padding: '40px'
        }}>
          <XCircle size={48} color="#dc3545" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 16px 0', color: '#dc3545' }}>Payment Error</h3>
          <p style={{ margin: '0 0 24px 0', color: '#666' }}>{error}</p>
          <Button
            onClick={() => history.push('/login')}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#74317e',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Return Home
          </Button>
        </Card>
      </Container>
    );
  }

  if (showSuccess) {
    return (
      <Container fluid style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <Card style={{ 
          maxWidth: '500px', 
          width: '100%',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
          padding: '40px',
          animation: 'fadeInUp 0.6s ease-out'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              animation: 'successPulse 1s ease-out',
              boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)'
            }}>
              <CheckCircle size={50} color="white" style={{ animation: 'checkmark 0.6s ease-out 0.3s both' }} />
            </div>
            <h2 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '32px', 
              fontWeight: '700',
              color: '#111827',
              animation: 'fadeIn 0.6s ease-out 0.4s both'
            }}>
              Payment Successful! 🎉
            </h2>
            <p style={{ 
              margin: '0 0 32px 0', 
              fontSize: '16px', 
              color: '#6b7280',
              lineHeight: '1.6',
              animation: 'fadeIn 0.6s ease-out 0.5s both'
            }}>
              Thank you for your payment. Your invoice has been marked as paid.
            </p>
            <div style={{
              padding: '20px',
              backgroundColor: '#f3f4f6',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                Invoice Number
              </p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                {paymentData?.invoice_number || 'N/A'}
              </p>
              <p style={{ margin: '16px 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                Amount Paid
              </p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#74317e' }}>
                {formatCurrency(paymentData?.amount || 0)}
              </p>
            </div>
            <Button
              onClick={() => history.push('/login')}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#74317e',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#5a2460';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(116, 49, 126, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#74317e';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Return Home
            </Button>
          </div>
        </Card>
        <style>
          {`
            @keyframes fadeInUp {
              0% { 
                opacity: 0; 
                transform: translateY(30px); 
              }
              100% { 
                opacity: 1; 
                transform: translateY(0); 
              }
            }
            @keyframes successPulse {
              0% { 
                transform: scale(0);
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
              }
              50% { 
                transform: scale(1.1);
                box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
              }
              100% { 
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
              }
            }
            @keyframes checkmark {
              0% { 
                transform: scale(0) rotate(45deg);
                opacity: 0;
              }
              50% { 
                transform: scale(1.2) rotate(45deg);
              }
              100% { 
                transform: scale(1) rotate(0deg);
                opacity: 1;
              }
            }
            @keyframes fadeIn {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
            @keyframes scaleIn {
              0% { transform: scale(0); opacity: 0; }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </Container>
    );
  }


  return (
    <Container fluid style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          {/* Header */}
          <div style={{ 
            marginBottom: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px' 
          }}>
            <Button
              variant="link"
              onClick={() => history.push('/')}
              style={{
                padding: '8px',
                color: 'white',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeft size={20} />
              Back
            </Button>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '600',
                color: 'white'
              }}>
                Secure Payment
              </h2>
              <p style={{ 
                margin: '4px 0 0 0', 
                fontSize: '14px', 
                color: 'rgba(255,255,255,0.9)'
              }}>
                Complete your payment securely
              </p>
            </div>
          </div>

          <Card style={{ 
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.5s ease-out',
            overflow: 'hidden'
          }}>
            <Card.Body style={{ padding: '40px' }}>
              {/* Payment Summary */}
              <div style={{
                padding: '24px',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                marginBottom: '32px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '16px', color: '#6c757d', fontWeight: '500' }}>
                    Invoice Number:
                  </span>
                  <span style={{ fontSize: '16px', color: '#212529', fontWeight: '600' }}>
                    {paymentData?.invoice_number || 'N/A'}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: '2px solid #dee2e6'
                }}>
                  <span style={{ fontSize: '20px', color: '#212529', fontWeight: '600' }}>
                    Total Amount:
                  </span>
                  <span style={{ fontSize: '28px', color: '#74317e', fontWeight: '700' }}>
                    {formatCurrency(paymentData?.amount || 0)}
                  </span>
                </div>
              </div>

              {/* Stripe Elements */}
              {!isAlreadyPaid && (
                clientSecret ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: paymentElementAppearance
                    }}
                    key={clientSecret}
                  >
                    <PaymentForm
                      amount={paymentData?.amount}
                      invoiceNumber={paymentData?.invoice_number}
                      encryptedData={encryptedData}
                      onSuccess={handleSuccess}
                      onError={handleError}
                      clientSecret={clientSecret}
                    />
                  </Elements>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      padding: '24px',
                      border: '2px dashed #e5e7eb',
                      borderRadius: '12px',
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    {error ? (
                      <>
                        <XCircle size={24} color="#dc2626" />
                        <span style={{ color: '#dc2626', fontWeight: 500 }}>
                          {error}
                        </span>
                      </>
                    ) : (
                      <>
                        <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                        <span style={{ color: '#6b7280', fontWeight: 500 }}>Initializing secure payment methods...</span>
                      </>
                    )}
                  </div>
                )
              )}

              {/* Security Notice */}
              <div style={{
                marginTop: '32px',
                padding: '16px',
                backgroundColor: '#e0f2fe',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Lock size={20} color="#0369a1" />
                <p style={{ 
                  margin: 0, 
                  fontSize: '13px', 
                  color: '#0369a1',
                  lineHeight: '1.5'
                }}>
                  Your payment information is encrypted and secure. We use Stripe to process payments securely.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Payment;
