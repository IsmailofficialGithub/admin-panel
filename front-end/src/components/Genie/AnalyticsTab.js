import React, { useState, useEffect, useCallback } from "react";
import { BarChart2, TrendingUp, Star, Check, Filter, Activity, Bot } from "lucide-react";
import { getCallAnalytics, getConversionMetrics, getBotPerformance } from "api/backend/genie";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import toast from "react-hot-toast";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function AnalyticsTab() {
  // State
  const [period, setPeriod] = useState("week");
  const [callAnalytics, setCallAnalytics] = useState(null);
  const [conversionMetrics, setConversionMetrics] = useState(null);
  const [botPerformance, setBotPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all analytics data
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, conversionRes, botsRes] = await Promise.all([
        getCallAnalytics({ period }),
        getConversionMetrics(period),
        getBotPerformance(period),
      ]);

      if (!analyticsRes?.error) setCallAnalytics(analyticsRes?.data);
      if (!conversionRes?.error) setConversionMetrics(conversionRes?.data);
      if (!botsRes?.error) setBotPerformance(botsRes?.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: {
        grid: { display: false }
      }
    },
  };

  // Call volume chart data
  const callVolumeData = {
    labels: callAnalytics?.chartData?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Total Calls',
        data: callAnalytics?.chartData?.map(d => d.total) || [],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Completed',
        data: callAnalytics?.chartData?.map(d => d.completed) || [],
        borderColor: '#22c55e',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Leads',
        data: callAnalytics?.chartData?.map(d => d.leads) || [],
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  // Conversion funnel data
  const funnelData = {
    labels: conversionMetrics?.funnel?.map(f => f.stage) || [],
    datasets: [
      {
        data: conversionMetrics?.funnel?.map(f => f.count) || [],
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Bot performance data
  const botPerformanceData = {
    labels: botPerformance?.bots?.map(b => b.botName?.substring(0, 15)) || [],
    datasets: [
      {
        label: 'Total Calls',
        data: botPerformance?.bots?.map(b => b.totalCalls) || [],
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderRadius: 6,
      },
      {
        label: 'Leads',
        data: botPerformance?.bots?.map(b => b.leads) || [],
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderRadius: 6,
      },
    ],
  };

  const getPeriodLabel = () => {
    switch(period) {
      case 'week': return '7 days';
      case 'month': return '30 days';
      case 'quarter': return '90 days';
      default: return period;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #f1f5f9',
          borderTopColor: '#74317e',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>Loading analytics...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        gap: '16px'
      }}>
        <div>
          <h5 style={{
            margin: '0 0 4px 0',
            fontWeight: '600',
            fontSize: '18px',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BarChart2 size={20} style={{ color: '#74317e' }} />
            Analytics Dashboard
          </h5>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Track your call campaign performance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['week', 'month', 'quarter'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '10px 16px',
                border: period === p ? 'none' : '1px solid #74317e',
                borderRadius: '8px',
                backgroundColor: period === p ? '#74317e' : 'white',
                color: period === p ? 'white' : '#74317e',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {p === 'week' ? '7 Days' : p === 'month' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', opacity: 0.9 }}>Completion Rate</p>
              <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>{conversionMetrics?.completionRate || 0}%</h3>
            </div>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Check size={24} />
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', opacity: 0.9 }}>Lead Conversion</p>
              <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>{conversionMetrics?.conversionRate || 0}%</h3>
            </div>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Star size={24} />
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', opacity: 0.9 }}>Total Leads ({getPeriodLabel()})</p>
              <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>{conversionMetrics?.funnel?.[2]?.count || 0}</h3>
            </div>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Call Volume Chart */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h6 style={{
            margin: '0 0 16px 0',
            fontWeight: '600',
            fontSize: '15px',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Activity size={16} style={{ color: '#667eea' }} />
            Call Volume Over Time
          </h6>
          <div style={{ height: '280px' }}>
            {callAnalytics?.chartData?.length > 0 ? (
              <Line data={callVolumeData} options={chartOptions} />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#94a3b8'
              }}>
                <Activity size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No data available for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h6 style={{
            margin: '0 0 16px 0',
            fontWeight: '600',
            fontSize: '15px',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Filter size={16} style={{ color: '#22c55e' }} />
            Conversion Funnel
          </h6>
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {conversionMetrics?.funnel?.some(f => f.count > 0) ? (
              <Doughnut 
                data={funnelData} 
                options={{
                  ...chartOptions,
                  cutout: '65%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { padding: 15, usePointStyle: true }
                    },
                  },
                }} 
              />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8'
              }}>
                <Filter size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bot Performance Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '16px'
      }}>
        {/* Bot Performance Chart */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h6 style={{
            margin: '0 0 16px 0',
            fontWeight: '600',
            fontSize: '15px',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BarChart2 size={16} style={{ color: '#f59e0b' }} />
            Bot Performance Comparison
          </h6>
          <div style={{ height: '280px' }}>
            {botPerformance?.bots?.length > 0 ? (
              <Bar data={botPerformanceData} options={chartOptions} />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#94a3b8'
              }}>
                <Bot size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No bot performance data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Bot Stats Table */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h6 style={{
            margin: '0 0 16px 0',
            fontWeight: '600',
            fontSize: '15px',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Bot size={16} style={{ color: '#667eea' }} />
            Bot Statistics
          </h6>
          {botPerformance?.bots?.length > 0 ? (
            <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
              {botPerformance.bots.map((bot, index) => (
                <div 
                  key={index} 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                      {bot.botName?.substring(0, 20)}{bot.botName?.length > 20 ? '...' : ''}
                    </div>
                    <small style={{ color: '#64748b', fontSize: '12px' }}>{bot.totalCalls} calls</small>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ 
                      backgroundColor: parseFloat(bot.successRate) >= 50 ? '#dcfce7' : '#fef3c7',
                      color: parseFloat(bot.successRate) >= 50 ? '#166534' : '#92400e',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {bot.successRate}%
                    </span>
                    <span style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {bot.leads} leads
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#94a3b8'
            }}>
              <Bot size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '14px' }}>No bots data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .analytics-charts-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default AnalyticsTab;
