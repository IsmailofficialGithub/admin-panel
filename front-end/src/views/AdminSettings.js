import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { 
  Settings, 
  Save, 
  Mail, 
  Server, 
  Database, 
  Key, 
  Globe, 
  Bell, 
  Lock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Store,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { getDefaultCommission, updateDefaultCommission, getResellerSettings, updateResellerSettings } from '../api/backend';

const AdminSettings = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' or 'error'
  const [activeMainTab, setActiveMainTab] = useState('general'); // Main tab
  const [activeSubTab, setActiveSubTab] = useState('basic'); // Sub-tab within main tab

  // Settings state
  const [settings, setSettings] = useState({
    // General Settings
    appName: 'Admin Dashboard',
    appVersion: '1.0.0',
    maintenanceMode: false,
    
    // Email Settings
    emailHost: '',
    emailPort: 587,
    emailUser: '',
    emailPassword: '',
    emailFrom: '',
    
    // Server Settings
    serverUrl: '',
    apiUrl: '',
    environment: 'production',
    
    // Database Settings
    dbConnectionString: '',
    
    // Security Settings
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireStrongPassword: true,
    twoFactorAuth: false,
    
    // Notification Settings
    emailNotifications: true,
    systemNotifications: true,
    activityLogRetention: 90,
    
    // Feature Flags
    enableResellerFeatures: true,
    enableConsumerFeatures: true,
    enableInvoiceFeatures: true,
    enableActivityLogs: true,
    
    // Reseller Settings
    maxConsumersPerReseller: '',
    defaultCommissionRate: '',
    minInvoiceAmount: '',
    requireResellerApproval: false,
    allowResellerPriceOverride: true
  });

  useEffect(() => {
    // Load settings from localStorage or API
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load all reseller settings from API
      const resellerSettingsResult = await getResellerSettings();
      console.log('📥 Reseller settings result from API:', resellerSettingsResult);
      
      let resellerSettings = {};
      if (resellerSettingsResult && resellerSettingsResult.success && resellerSettingsResult.data) {
        resellerSettings = {
          maxConsumersPerReseller: resellerSettingsResult.data.maxConsumersPerReseller || '',
          defaultCommissionRate: resellerSettingsResult.data.defaultCommissionRate || '',
          minInvoiceAmount: resellerSettingsResult.data.minInvoiceAmount || '',
          requireResellerApproval: resellerSettingsResult.data.requireResellerApproval || false,
          allowResellerPriceOverride: resellerSettingsResult.data.allowResellerPriceOverride !== undefined 
            ? resellerSettingsResult.data.allowResellerPriceOverride 
            : true
        };
        console.log('✅ Loaded reseller settings from API:', resellerSettings);
      } else {
        console.warn('⚠️ Could not load reseller settings from API, using defaults');
      }

      // Load from localStorage as fallback for other settings
      const savedSettings = localStorage.getItem('adminSettings');
      let localStorageSettings = {};
      if (savedSettings) {
        try {
          localStorageSettings = JSON.parse(savedSettings);
        } catch (e) {
          console.error('Error parsing localStorage settings:', e);
        }
      }

      // Remove reseller settings from localStorage (they're managed by API)
      const resellerSettingsKeys = ['maxConsumersPerReseller', 'defaultCommissionRate', 'minInvoiceAmount', 'requireResellerApproval', 'allowResellerPriceOverride'];
      resellerSettingsKeys.forEach(key => {
        if (localStorageSettings[key] !== undefined) {
          delete localStorageSettings[key];
        }
      });
      if (Object.keys(localStorageSettings).length !== JSON.parse(savedSettings || '{}').length) {
        localStorage.setItem('adminSettings', JSON.stringify(localStorageSettings));
      }

      // Merge settings - always use API values for reseller settings
      setSettings(prev => {
        const newSettings = {
          ...prev,
          ...localStorageSettings,
          ...resellerSettings
        };
        
        console.log('🔄 Updated settings:', newSettings);
        return newSettings;
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: typeof prev[field] === 'boolean' ? !prev[field] : value
    }));
    setSaveStatus(null); // Clear previous save status
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    
    try {
      // Save all reseller settings to API if on resellers tab
      if (activeMainTab === 'general' && activeSubTab === 'resellers') {
        console.log('🔄 Saving reseller settings:', {
          maxConsumersPerReseller: settings.maxConsumersPerReseller,
          defaultCommissionRate: settings.defaultCommissionRate,
          minInvoiceAmount: settings.minInvoiceAmount,
          requireResellerApproval: settings.requireResellerApproval,
          allowResellerPriceOverride: settings.allowResellerPriceOverride
        });
        
        const resellerSettingsToSave = {
          maxConsumersPerReseller: settings.maxConsumersPerReseller || null,
          defaultCommissionRate: settings.defaultCommissionRate || null,
          minInvoiceAmount: settings.minInvoiceAmount || null,
          requireResellerApproval: settings.requireResellerApproval || false,
          allowResellerPriceOverride: settings.allowResellerPriceOverride !== undefined 
            ? settings.allowResellerPriceOverride 
            : true
        };
        
        const result = await updateResellerSettings(resellerSettingsToSave);
        console.log('📥 Reseller settings update result:', result);
        
        // Check if result indicates success
        if (result && result.success === true) {
          toast.success(result.message || 'Reseller settings updated successfully!');
          // Reload settings from API to get the latest values
          await loadSettings();
        } else {
          // If result doesn't have success: true, it might still be successful (check response structure)
          if (result && !result.error) {
            // No error field means it might be successful
            toast.success('Reseller settings updated successfully!');
            await loadSettings();
          } else {
            throw new Error(result?.error || result?.message || 'Failed to update reseller settings');
          }
        }
      }

      // Save to localStorage for other settings (exclude reseller settings since they're managed by API)
      const resellerSettingsKeys = ['maxConsumersPerReseller', 'defaultCommissionRate', 'minInvoiceAmount', 'requireResellerApproval', 'allowResellerPriceOverride'];
      const settingsForLocalStorage = { ...settings };
      resellerSettingsKeys.forEach(key => {
        delete settingsForLocalStorage[key];
      });
      localStorage.setItem('adminSettings', JSON.stringify(settingsForLocalStorage));
      
      setSaveStatus('success');
      // Only show generic success toast if we didn't already show one for reseller settings
      if (!(activeMainTab === 'general' && activeSubTab === 'resellers')) {
        toast.success('Settings saved successfully!');
      }
      
      // Clear success status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      setSaveStatus('error');
      toast.error(error.message || 'Failed to save settings');
      
      // Clear error status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      localStorage.removeItem('adminSettings');
      loadSettings();
      toast.success('Settings reset to default');
    }
  };

  // Main tabs configuration
  const mainTabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'server', label: 'Server', icon: Server },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'features', label: 'Features', icon: Key }
  ];

  // Sub-tabs configuration for each main tab
  const subTabsConfig = {
    general: [
      { id: 'basic', label: 'Basic' },
      { id: 'resellers', label: 'Resellers', icon: Store }
    ],
    email: [
      { id: 'smtp', label: 'SMTP' },
      { id: 'templates', label: 'Templates' }
    ],
    server: [
      { id: 'urls', label: 'URLs' },
      { id: 'database', label: 'Database' }
    ],
    security: [
      { id: 'authentication', label: 'Authentication' },
      { id: 'permissions', label: 'Permissions' }
    ],
    notifications: [
      { id: 'email', label: 'Email' },
      { id: 'system', label: 'System' }
    ],
    features: [
      { id: 'flags', label: 'Feature Flags' },
      { id: 'modules', label: 'Modules' }
    ]
  };

  const currentSubTabs = subTabsConfig[activeMainTab] || [];

  // Reset sub-tab when main tab changes - MUST be before any early returns
  useEffect(() => {
    const currentSubTabs = subTabsConfig[activeMainTab] || [];
    if (currentSubTabs.length > 0) {
      setActiveSubTab(currentSubTabs[0].id);
    }
  }, [activeMainTab]);

  if (loading) {
    return (
      <Container fluid style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #74317e',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#6c757d' }}>Loading settings...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid style={{ padding: '24px' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} color="#74317e" />
          Settings
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
          Configure application settings and preferences
        </p>
      </div>

      {/* Save Status Alert */}
      {saveStatus && (
        <Alert 
          variant={saveStatus === 'success' ? 'success' : 'danger'}
          style={{ 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px'
          }}
        >
          {saveStatus === 'success' ? (
            <>
              <CheckCircle size={18} />
              Settings saved successfully!
            </>
          ) : (
            <>
              <XCircle size={18} />
              Failed to save settings. Please try again.
            </>
          )}
        </Alert>
      )}

      {/* Main Tabs */}
      <Card style={{ marginBottom: '24px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <Card.Body style={{ padding: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {mainTabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeMainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: isActive ? '#74317e' : 'transparent',
                    color: isActive ? 'white' : '#6c757d',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    transition: 'all 0.2s ease',
                    borderBottom: isActive ? '2px solid #74317e' : '2px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.color = '#74317e';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6c757d';
                    }
                  }}
                >
                  <IconComponent size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </Card.Body>
      </Card>

      {/* Sub-Tabs */}
      {currentSubTabs.length > 1 && (
        <Card style={{ marginBottom: '24px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Card.Body style={{ padding: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {currentSubTabs.map((subTab) => {
                const isActive = activeSubTab === subTab.id;
                const SubIcon = subTab.icon;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setActiveSubTab(subTab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: isActive ? '#e9d5ff' : 'transparent',
                      color: isActive ? '#74317e' : '#6c757d',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: isActive ? '600' : '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {SubIcon && <SubIcon size={16} />}
                    {subTab.label}
                  </button>
                );
              })}
            </div>
          </Card.Body>
        </Card>
      )}

      <Form>
        {/* General Settings - Basic Tab */}
        {activeMainTab === 'general' && activeSubTab === 'basic' && (
          <Card style={{ marginBottom: '24px' }}>
          <Card.Header style={{ 
            backgroundColor: '#74317e', 
            color: 'white',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Globe size={20} />
            <h5 style={{ margin: 0, fontWeight: '600' }}>General Settings</h5>
          </Card.Header>
          <Card.Body style={{ padding: '24px' }}>
            <Row>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Application Name
                </label>
                <input
                  type="text"
                  value={settings.appName}
                  onChange={(e) => handleChange('appName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Application Version
                </label>
                <input
                  type="text"
                  value={settings.appVersion}
                  onChange={(e) => handleChange('appVersion', e.target.value)}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#f9fafb',
                    color: '#6c757d'
                  }}
                />
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Environment
                </label>
                <select
                  value={settings.environment}
                  onChange={(e) => handleChange('environment', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </Col>
              <Col md={6} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', paddingTop: '28px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Maintenance Mode</span>
                </label>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        )}

        {/* General Settings - Resellers Tab */}
        {activeMainTab === 'general' && activeSubTab === 'resellers' && (
          <Card style={{ marginBottom: '24px' }}>
            <Card.Header style={{ 
              backgroundColor: '#8b5cf6', 
              color: 'white',
              borderBottom: 'none',
              borderRadius: '8px 8px 0 0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Store size={20} />
              <h5 style={{ margin: 0, fontWeight: '600' }}>Reseller Settings</h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              <Row>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={settings.enableResellerFeatures}
                      onChange={() => handleChange('enableResellerFeatures', !settings.enableResellerFeatures)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Enable Reseller Features</span>
                  </label>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Maximum Consumers per Reseller
                  </label>
                  <input
                    type="number"
                    value={settings.maxConsumersPerReseller || ''}
                    onChange={(e) => handleChange('maxConsumersPerReseller', parseInt(e.target.value) || '')}
                    placeholder="Unlimited"
                    min={0}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Default Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    value={settings.defaultCommissionRate ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string for clearing, otherwise parse as float
                      handleChange('defaultCommissionRate', value === '' ? '' : parseFloat(value) || '');
                    }}
                    placeholder="Enter commission rate (0-100)"
                    min={0}
                    max={100}
                    step={0.01}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', marginBottom: 0 }}>
                    This will be applied to all resellers without custom commission. New resellers will use this default.
                  </p>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Minimum Invoice Amount
                  </label>
                  <input
                    type="number"
                    value={settings.minInvoiceAmount || ''}
                    onChange={(e) => handleChange('minInvoiceAmount', parseFloat(e.target.value) || '')}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </Col>
                <Col md={12} style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={settings.requireResellerApproval || false}
                      onChange={() => handleChange('requireResellerApproval', !(settings.requireResellerApproval || false))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Require Admin Approval for New Resellers</span>
                  </label>
                </Col>
                <Col md={12} style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={settings.allowResellerPriceOverride || false}
                      onChange={() => handleChange('allowResellerPriceOverride', !(settings.allowResellerPriceOverride || false))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Allow Resellers to Override Product Prices (must be equal or greater than original)</span>
                  </label>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Email Settings */}
        {activeMainTab === 'email' && activeSubTab === 'smtp' && (
          <Card style={{ marginBottom: '24px' }}>
          <Card.Header style={{ 
            backgroundColor: '#8b5cf6', 
            color: 'white',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Mail size={20} />
            <h5 style={{ margin: 0, fontWeight: '600' }}>Email Settings</h5>
          </Card.Header>
          <Card.Body style={{ padding: '24px' }}>
            <Row>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.emailHost}
                  onChange={(e) => handleChange('emailHost', e.target.value)}
                  placeholder="smtp.gmail.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.emailPort}
                  onChange={(e) => handleChange('emailPort', parseInt(e.target.value) || 587)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Email Username
                </label>
                <input
                  type="text"
                  value={settings.emailUser}
                  onChange={(e) => handleChange('emailUser', e.target.value)}
                  placeholder="your-email@gmail.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Email Password (App Password)
                </label>
                <input
                  type="password"
                  value={settings.emailPassword}
                  onChange={(e) => handleChange('emailPassword', e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  From Email Address
                </label>
                <input
                  type="email"
                  value={settings.emailFrom}
                  onChange={(e) => handleChange('emailFrom', e.target.value)}
                  placeholder="noreply@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>
        )}

        {/* Email Settings - Templates Tab */}
        {activeMainTab === 'email' && activeSubTab === 'templates' && (
          <Card style={{ marginBottom: '24px' }}>
            <Card.Header style={{ 
              backgroundColor: '#8b5cf6', 
              color: 'white',
              borderBottom: 'none',
              borderRadius: '8px 8px 0 0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Mail size={20} />
              <h5 style={{ margin: 0, fontWeight: '600' }}>Email Templates</h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
                Email template settings coming soon...
              </p>
            </Card.Body>
          </Card>
        )}

        {/* Server Settings */}
        {activeMainTab === 'server' && activeSubTab === 'urls' && (
          <Card style={{ marginBottom: '24px' }}>
          <Card.Header style={{ 
            backgroundColor: '#10b981', 
            color: 'white',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Server size={20} />
            <h5 style={{ margin: 0, fontWeight: '600' }}>Server Settings</h5>
          </Card.Header>
          <Card.Body style={{ padding: '24px' }}>
            <Row>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Server URL
                </label>
                <input
                  type="url"
                  value={settings.serverUrl}
                  onChange={(e) => handleChange('serverUrl', e.target.value)}
                  placeholder="http://localhost:5000"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  API URL
                </label>
                <input
                  type="url"
                  value={settings.apiUrl}
                  onChange={(e) => handleChange('apiUrl', e.target.value)}
                  placeholder="http://localhost:5000/api"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>
        )}

        {/* Server Settings - Database Tab */}
        {activeMainTab === 'server' && activeSubTab === 'database' && (
          <Card style={{ marginBottom: '24px' }}>
            <Card.Header style={{ 
              backgroundColor: '#10b981', 
              color: 'white',
              borderBottom: 'none',
              borderRadius: '8px 8px 0 0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Database size={20} />
              <h5 style={{ margin: 0, fontWeight: '600' }}>Database Settings</h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              <Row>
                <Col md={12} style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Database Connection String
                  </label>
                  <input
                    type="password"
                    value={settings.dbConnectionString}
                    onChange={(e) => handleChange('dbConnectionString', e.target.value)}
                    placeholder="Database connection string (hidden for security)"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                    Database connection is configured securely. Contact administrator for changes.
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Security Settings */}
        {activeMainTab === 'security' && activeSubTab === 'authentication' && (
          <Card style={{ marginBottom: '24px' }}>
          <Card.Header style={{ 
            backgroundColor: '#ef4444', 
            color: 'white',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Lock size={20} />
            <h5 style={{ margin: 0, fontWeight: '600' }}>Security Settings</h5>
          </Card.Header>
          <Card.Body style={{ padding: '24px' }}>
            <Row>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value) || 30)}
                  min={5}
                  max={1440}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => handleChange('passwordMinLength', parseInt(e.target.value) || 8)}
                  min={6}
                  max={32}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.requireStrongPassword}
                    onChange={() => handleChange('requireStrongPassword', !settings.requireStrongPassword)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Require Strong Password</span>
                </label>
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.twoFactorAuth}
                    onChange={() => handleChange('twoFactorAuth', !settings.twoFactorAuth)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable Two-Factor Authentication</span>
                </label>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        )}

        {/* Security Settings - Permissions Tab */}
        {activeMainTab === 'security' && activeSubTab === 'permissions' && (
          <Card style={{ marginBottom: '24px' }}>
            <Card.Header style={{ 
              backgroundColor: '#ef4444', 
              color: 'white',
              borderBottom: 'none',
              borderRadius: '8px 8px 0 0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Lock size={20} />
              <h5 style={{ margin: 0, fontWeight: '600' }}>Permissions</h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
                Permission settings coming soon...
              </p>
            </Card.Body>
          </Card>
        )}

        {/* Notification Settings */}
        {activeMainTab === 'notifications' && activeSubTab === 'email' && (
          <Card style={{ marginBottom: '24px' }}>
          <Card.Header style={{ 
            backgroundColor: '#f59e0b', 
            color: 'white',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Bell size={20} />
            <h5 style={{ margin: 0, fontWeight: '600' }}>Notification Settings</h5>
          </Card.Header>
          <Card.Body style={{ padding: '24px' }}>
            <Row>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={() => handleChange('emailNotifications', !settings.emailNotifications)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable Email Notifications</span>
                </label>
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.systemNotifications}
                    onChange={() => handleChange('systemNotifications', !settings.systemNotifications)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable System Notifications</span>
                </label>
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  Activity Log Retention (days)
                </label>
                <input
                  type="number"
                  value={settings.activityLogRetention}
                  onChange={(e) => handleChange('activityLogRetention', parseInt(e.target.value) || 90)}
                  min={1}
                  max={365}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>
        )}

        {/* Notification Settings - System Tab */}
        {activeMainTab === 'notifications' && activeSubTab === 'system' && (
          <Card style={{ marginBottom: '24px' }}>
            <Card.Header style={{ 
              backgroundColor: '#f59e0b', 
              color: 'white',
              borderBottom: 'none',
              borderRadius: '8px 8px 0 0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Bell size={20} />
              <h5 style={{ margin: 0, fontWeight: '600' }}>System Notifications</h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              <Row>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={settings.systemNotifications}
                      onChange={() => handleChange('systemNotifications', !settings.systemNotifications)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Enable System Notifications</span>
                  </label>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Activity Log Retention (days)
                  </label>
                  <input
                    type="number"
                    value={settings.activityLogRetention}
                    onChange={(e) => handleChange('activityLogRetention', parseInt(e.target.value) || 90)}
                    min={1}
                    max={365}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Feature Flags */}
        {activeMainTab === 'features' && activeSubTab === 'flags' && (
          <Card style={{ marginBottom: '24px' }}>
          <Card.Header style={{ 
            backgroundColor: '#06b6d4', 
            color: 'white',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Key size={20} />
            <h5 style={{ margin: 0, fontWeight: '600' }}>Feature Flags</h5>
          </Card.Header>
          <Card.Body style={{ padding: '24px' }}>
            <Row>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.enableResellerFeatures}
                    onChange={() => handleChange('enableResellerFeatures', !settings.enableResellerFeatures)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable Reseller Features</span>
                </label>
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.enableConsumerFeatures}
                    onChange={() => handleChange('enableConsumerFeatures', !settings.enableConsumerFeatures)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable Consumer Features</span>
                </label>
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.enableInvoiceFeatures}
                    onChange={() => handleChange('enableInvoiceFeatures', !settings.enableInvoiceFeatures)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable Invoice Features</span>
                </label>
              </Col>
              <Col md={6} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.enableActivityLogs}
                    onChange={() => handleChange('enableActivityLogs', !settings.enableActivityLogs)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable Activity Logs</span>
                </label>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        )}

        {/* Feature Flags - Modules Tab */}
        {activeMainTab === 'features' && activeSubTab === 'modules' && (
          <Card style={{ marginBottom: '24px' }}>
            <Card.Header style={{ 
              backgroundColor: '#06b6d4', 
              color: 'white',
              borderBottom: 'none',
              borderRadius: '8px 8px 0 0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Key size={20} />
              <h5 style={{ margin: 0, fontWeight: '600' }}>Modules</h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
                Module settings coming soon...
              </p>
            </Card.Body>
          </Card>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px',
          marginTop: '24px',
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          <Button
            variant="outline-secondary"
            onClick={handleReset}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px'
            }}
          >
            <RefreshCw size={18} />
            Reset to Default
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: '#74317e',
              borderColor: '#74317e'
            }}
          >
            {saving ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default AdminSettings;

