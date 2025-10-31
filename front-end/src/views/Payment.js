import React, { useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { CreditCard, Lock, ArrowLeft, CheckCircle, Building2, Wallet, Globe } from 'lucide-react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';

const Payment = () => {
  const location = useLocation();
  const history = useHistory();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get query parameters
  const searchParams = new URLSearchParams(location.search);
  const amount = searchParams.get('amount') || '0.00';
  const invoiceId = searchParams.get('invoice_id') || '';
  const userId = searchParams.get('user_id') || '';
  const invoiceNumber = searchParams.get('invoice_number') || '';

  useEffect(() => {
    // If no amount parameter, redirect to login
    if (!amount || amount === '0.00') {
      toast.error('Invalid payment amount');
      history.push('/login');
    }
  }, [amount, history]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(value) || 0);
  };

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    value = value.replace(/(.{4})/g, '$1 ').trim();
    setCardData({ ...cardData, cardNumber: value });
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setCardData({ ...cardData, expiryDate: value });
  };

  const handleCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    setCardData({ ...cardData, cvv: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (paymentMethod === 'card') {
      if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 16) {
        toast.error('Please enter a valid card number');
        return;
      }
      if (!cardData.expiryDate || cardData.expiryDate.length < 5) {
        toast.error('Please enter a valid expiry date');
        return;
      }
      if (!cardData.cvv || cardData.cvv.length < 3) {
        toast.error('Please enter a valid CVV');
        return;
      }
      if (!cardData.cardholderName) {
        toast.error('Please enter cardholder name');
        return;
      }
    }

    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setShowSuccess(true);
      toast.success('Payment processing initiated!');
    }, 2000);
  };

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
              Payment Coming Soon
            </h2>
            <p style={{ 
              margin: '0 0 32px 0', 
              fontSize: '16px', 
              color: '#6b7280',
              lineHeight: '1.6'
            }}>
              Thank you for your interest! Payment processing is currently being set up and will be available soon.
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
                {invoiceNumber || 'N/A'}
              </p>
              <p style={{ margin: '16px 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                Amount
              </p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#74317e' }}>
                {formatCurrency(amount)}
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
                    {invoiceNumber || 'N/A'}
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
                    {formatCurrency(amount)}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div style={{ marginBottom: '32px' }}>
                <h5 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: '#212529'
                }}>
                  Select Payment Method
                </h5>
                <div style={{ 
                  display: 'flex', 
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    style={{
                      flex: '1',
                      minWidth: '150px',
                      padding: '16px',
                      border: paymentMethod === 'card' ? '2px solid #74317e' : '2px solid #e0e0e0',
                      borderRadius: '12px',
                      backgroundColor: paymentMethod === 'card' ? '#f8f4ff' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (paymentMethod !== 'card') {
                        e.target.style.borderColor = '#74317e';
                        e.target.style.backgroundColor = '#f8f4ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (paymentMethod !== 'card') {
                        e.target.style.borderColor = '#e0e0e0';
                        e.target.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <CreditCard size={24} color={paymentMethod === 'card' ? '#74317e' : '#6c757d'} />
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '500',
                      color: paymentMethod === 'card' ? '#74317e' : '#6c757d'
                    }}>
                      Credit Card
                    </span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('bank')}
                    style={{
                      flex: '1',
                      minWidth: '150px',
                      padding: '16px',
                      border: paymentMethod === 'bank' ? '2px solid #74317e' : '2px solid #e0e0e0',
                      borderRadius: '12px',
                      backgroundColor: paymentMethod === 'bank' ? '#f8f4ff' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (paymentMethod !== 'bank') {
                        e.target.style.borderColor = '#74317e';
                        e.target.style.backgroundColor = '#f8f4ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (paymentMethod !== 'bank') {
                        e.target.style.borderColor = '#e0e0e0';
                        e.target.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <Building2 size={24} color={paymentMethod === 'bank' ? '#74317e' : '#6c757d'} />
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '500',
                      color: paymentMethod === 'bank' ? '#74317e' : '#6c757d'
                    }}>
                      Bank Transfer
                    </span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('wallet')}
                    style={{
                      flex: '1',
                      minWidth: '150px',
                      padding: '16px',
                      border: paymentMethod === 'wallet' ? '2px solid #74317e' : '2px solid #e0e0e0',
                      borderRadius: '12px',
                      backgroundColor: paymentMethod === 'wallet' ? '#f8f4ff' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (paymentMethod !== 'wallet') {
                        e.target.style.borderColor = '#74317e';
                        e.target.style.backgroundColor = '#f8f4ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (paymentMethod !== 'wallet') {
                        e.target.style.borderColor = '#e0e0e0';
                        e.target.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <Wallet size={24} color={paymentMethod === 'wallet' ? '#74317e' : '#6c757d'} />
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '500',
                      color: paymentMethod === 'wallet' ? '#74317e' : '#6c757d'
                    }}>
                      Digital Wallet
                    </span>
                  </button>
                </div>
              </div>

              {/* Payment Form */}
              {paymentMethod === 'card' && (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      Card Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <CreditCard 
                        size={20} 
                        style={{
                          position: 'absolute',
                          left: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#6c757d'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardData.cardNumber}
                        onChange={handleCardNumberChange}
                        maxLength={19}
                        style={{
                          width: '100%',
                          padding: '14px 16px 14px 48px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '10px',
                          fontSize: '16px',
                          fontFamily: 'monospace',
                          outline: 'none',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#74317e';
                          e.target.style.boxShadow = '0 0 0 4px rgba(116, 49, 126, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e0e0e0';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  <Row>
                    <Col md={8}>
                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardData.expiryDate}
                          onChange={handleExpiryChange}
                          maxLength={5}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontFamily: 'monospace',
                            outline: 'none',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#74317e';
                            e.target.style.boxShadow = '0 0 0 4px rgba(116, 49, 126, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e0e0e0';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </Col>
                    <Col md={4}>
                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          CVV
                        </label>
                        <input
                          type="text"
                          placeholder="123"
                          value={cardData.cvv}
                          onChange={handleCvvChange}
                          maxLength={4}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontFamily: 'monospace',
                            outline: 'none',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#74317e';
                            e.target.style.boxShadow = '0 0 0 4px rgba(116, 49, 126, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e0e0e0';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </Col>
                  </Row>

                  <div style={{ marginBottom: '32px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardData.cardholderName}
                      onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '10px',
                        fontSize: '16px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#74317e';
                        e.target.style.boxShadow = '0 0 0 4px rgba(116, 49, 126, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e0e0e0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: isProcessing ? '#9ca3af' : '#74317e',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: '600',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      boxShadow: isProcessing ? 'none' : '0 4px 15px rgba(116, 49, 126, 0.4)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isProcessing) {
                        e.target.style.backgroundColor = '#5a2460';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(116, 49, 126, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isProcessing) {
                        e.target.style.backgroundColor = '#74317e';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(116, 49, 126, 0.4)';
                      }
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '3px solid rgba(255,255,255,0.3)',
                          borderTop: '3px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
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
              )}

              {paymentMethod === 'bank' && (
                <div style={{
                  padding: '24px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <Building2 size={48} color="#74317e" style={{ marginBottom: '16px' }} />
                  <p style={{ fontSize: '16px', color: '#6c757d', margin: '0 0 24px 0' }}>
                    Bank transfer details will be displayed here
                  </p>
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: isProcessing ? '#9ca3af' : '#74317e',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: '600',
                      cursor: isProcessing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isProcessing ? 'Processing...' : 'Continue'}
                  </Button>
                </div>
              )}

              {paymentMethod === 'wallet' && (
                <div style={{
                  padding: '24px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <Wallet size={48} color="#74317e" style={{ marginBottom: '16px' }} />
                  <p style={{ fontSize: '16px', color: '#6c757d', margin: '0 0 24px 0' }}>
                    Digital wallet options will be displayed here
                  </p>
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: isProcessing ? '#9ca3af' : '#74317e',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: '600',
                      cursor: isProcessing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isProcessing ? 'Processing...' : 'Continue'}
                  </Button>
                </div>
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
                  Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </Container>
  );
};

export default Payment;

