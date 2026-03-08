import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        const data = await response.json();
        setDashboardData(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  const {
    currentMonthRevenue,
    dailyTrendData,
    topPages,
    revenueByNetwork,
    monthEndProjection,
    targetRevenue,
    gap,
    daysInMonth,
    daysRemaining,
    dailyAverage,
  } = dashboardData;

  const gapPercentage = ((monthEndProjection / targetRevenue) * 100).toFixed(1);
  const isOnTrack = monthEndProjection >= targetRevenue;

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>WeTried.it Revenue Dashboard</h1>
      <p style={styles.subtitle}>Path to $10K/Month</p>

      {/* Key Metrics Section */}
      <div style={styles.metricsGrid}>
        {/* Current Month Revenue */}
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Current Month Revenue</div>
          <div style={styles.metricValue}>
            ${currentMonthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={styles.metricSubtext}>({daysRemaining} days remaining)</div>
        </div>

        {/* Daily Average */}
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Daily Average</div>
          <div style={styles.metricValue}>
            ${dailyAverage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={styles.metricSubtext}>{daysInMonth} days in month</div>
        </div>

        {/* Month-End Projection */}
        <div style={{ ...styles.metricCard, backgroundColor: isOnTrack ? '#e8f5e9' : '#fff3e0' }}>
          <div style={styles.metricLabel}>Month-End Projection</div>
          <div style={styles.metricValue}>
            ${monthEndProjection.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={styles.metricSubtext}>{gapPercentage}% of goal</div>
        </div>

        {/* Gap to $10K */}
        <div style={{ ...styles.metricCard, backgroundColor: gap < 0 ? '#e3f2fd' : '#ffebee' }}>
          <div style={styles.metricLabel}>Gap to $10K Goal</div>
          <div style={styles.metricValue}>${Math.abs(gap).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div style={styles.metricSubtext}>
            {gap < 0 ? '✅ ON TRACK' : '❌ ' + (gap > 0 ? 'Still need' : 'Exceeded')}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={styles.chartsGrid}>
        {/* Daily Trend Chart */}
        <div style={styles.chartContainer}>
          <h2 style={styles.chartTitle}>Daily Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={dailyTrendData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `$${value.toFixed(2)}`}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8884d8"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Network */}
        <div style={styles.chartContainer}>
          <h2 style={styles.chartTitle}>Revenue by Affiliate Network</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueByNetwork}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  `${name}: $${value.toFixed(2)} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueByNetwork.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performing Pages */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Top Performing Pages</h2>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableCell}>Page / Product</th>
              <th style={styles.tableCell}>Revenue</th>
              <th style={styles.tableCell}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {topPages.map((page, index) => (
              <tr key={index} style={styles.tableRow}>
                <td style={styles.tableCell}>{page.name}</td>
                <td style={styles.tableCell}>
                  ${page.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={styles.tableCell}>{page.percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Revenue by Network Details */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Revenue by Affiliate Network</h2>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableCell}>Network</th>
              <th style={styles.tableCell}>Revenue</th>
              <th style={styles.tableCell}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {revenueByNetwork.map((network, index) => (
              <tr key={index} style={styles.tableRow}>
                <td style={styles.tableCell}>{network.name}</td>
                <td style={styles.tableCell}>
                  ${network.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={styles.tableCell}>
                  {((network.value / currentMonthRevenue) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Goal Progress Bar */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Goal Progress: ${targetRevenue.toFixed(2)} Target</h2>
        <div style={styles.progressBarContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${Math.min((monthEndProjection / targetRevenue) * 100, 100)}%`,
                backgroundColor: isOnTrack ? '#4caf50' : '#ff9800',
              }}
            />
          </div>
          <div style={styles.progressLabel}>
            {gapPercentage}% Complete
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    color: '#333',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0 0 30px 0',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  metricLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    color: '#999',
    marginBottom: '10px',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px',
  },
  metricSubtext: {
    fontSize: '12px',
    color: '#666',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
    marginTop: '0',
  },
  section: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginTop: '0',
    marginBottom: '15px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  tableHeader: {
    backgroundColor: '#f9f9f9',
    borderBottom: '2px solid #ddd',
  },
  tableCell: {
    padding: '12px',
    textAlign: 'left',
  },
  tableRow: {
    borderBottom: '1px solid #eee',
  },
  progressBarContainer: {
    marginTop: '15px',
  },
  progressBar: {
    backgroundColor: '#eee',
    height: '30px',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  progressLabel: {
    fontSize: '12px',
    color: '#666',
  },
  loading: {
    fontSize: '18px',
    color: '#666',
    textAlign: 'center',
    padding: '40px',
  },
  error: {
    fontSize: '18px',
    color: '#d32f2f',
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
  },
};

export default Dashboard;
