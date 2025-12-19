import React from 'react';
import { X } from 'lucide-react';

function BotDetailsModal({ bot, show, onClose }) {
  if (!show || !bot) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '2px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#333' }}>
              Bot Details & Settings
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={20} color="#6c757d" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Basic Information */}
              <div>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#74317e',
                  borderBottom: '1px solid #e9ecef',
                  paddingBottom: '8px'
                }}>
                  Basic Information
                </h4>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6c757d',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '6px'
                    }}>
                      Name
                    </label>
                    <p style={{ margin: 0, fontSize: '15px', color: '#212529' }}>
                      {bot.name || '-'}
                    </p>
                  </div>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6c757d',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '6px'
                    }}>
                      Company Name
                    </label>
                    <p style={{ margin: 0, fontSize: '15px', color: '#212529' }}>
                      {bot.company_name || '-'}
                    </p>
                  </div>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6c757d',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '6px'
                    }}>
                      Goal
                    </label>
                    <p style={{
                      margin: 0,
                      fontSize: '15px',
                      color: '#212529',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {bot.goal || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#74317e',
                  borderBottom: '1px solid #e9ecef',
                  paddingBottom: '8px'
                }}>
                  Configuration
                </h4>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6c757d',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '6px'
                    }}>
                      Voice
                    </label>
                    <p style={{ margin: 0, fontSize: '15px', color: '#212529' }}>
                      {bot.voice || '-'}
                    </p>
                  </div>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6c757d',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '6px'
                    }}>
                      Language
                    </label>
                    <p style={{ margin: 0, fontSize: '15px', color: '#212529' }}>
                      {bot.language || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#74317e',
                  borderBottom: '1px solid #e9ecef',
                  paddingBottom: '8px'
                }}>
                  Metadata
                </h4>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6c757d',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '6px'
                    }}>
                      Bot ID
                    </label>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#6c757d',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all'
                    }}>
                      {bot.id || '-'}
                    </p>
                  </div>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6c757d',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '6px'
                    }}>
                      Created At
                    </label>
                    <p style={{ margin: 0, fontSize: '15px', color: '#212529' }}>
                      {formatDate(bot.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#f8f9fa'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px',
                backgroundColor: '#74317e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a2670'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#74317e'}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default BotDetailsModal;

