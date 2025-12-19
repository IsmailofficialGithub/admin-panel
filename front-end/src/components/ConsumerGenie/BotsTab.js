import React, { useState, useEffect } from 'react';
import { Table } from 'react-bootstrap';
import { Bot, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiClient from '../../services/apiClient';
import BotDetailsModal from './BotDetailsModal';

function BotsTab({ consumerId }) {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchBots();
  }, [consumerId]);

  const fetchBots = async () => {
    setLoading(true);
    try {
      const response = await apiClient.genie.getAllBots({ ownerUserId: consumerId });
      if (response?.success) {
        setBots(response.data || []);
      } else {
        toast.error('Failed to fetch bots');
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
      toast.error('Failed to fetch bots');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBot = (bot) => {
    setSelectedBot(bot);
    setShowModal(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #74317e',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }} />
        <p style={{ marginTop: '16px', color: '#6c757d' }}>Loading bots...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Bot Count Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>Total Genie Agents</p>
            <h2 style={{ margin: 0, fontSize: '36px', fontWeight: '700' }}>{bots.length}</h2>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={32} />
          </div>
        </div>
      </div>

      {/* Bots List */}
      {bots.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '1px dashed #dee2e6'
        }}>
          <Bot size={48} color="#adb5bd" style={{ marginBottom: '16px' }} />
          <p style={{ color: '#6c757d', fontSize: '16px', margin: 0 }}>No Genie agents created yet</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <Table striped hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Goal</th>
                <th>Voice</th>
                <th>Language</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bots.map((bot) => (
                <tr key={bot.id}>
                  <td style={{ fontWeight: '500' }}>{bot.name || '-'}</td>
                  <td>{bot.company_name || '-'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bot.goal || '-'}
                  </td>
                  <td>{bot.voice || '-'}</td>
                  <td>{bot.language || '-'}</td>
                  <td>{formatDate(bot.created_at)}</td>
                  <td>
                    <button
                      onClick={() => handleViewBot(bot)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#74317e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px'
                      }}
                    >
                      <Eye size={16} />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {showModal && selectedBot && (
        <BotDetailsModal
          bot={selectedBot}
          show={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedBot(null);
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default BotsTab;

