/**
 * Convert Artillery JSON report to beautiful HTML
 * Usage: node scripts/generate-report.js
 */

import fs from 'fs';
import path from 'path';

const JSON_REPORT = 'artillery-report.json';
const HTML_REPORT = 'artillery-report.html';

function formatNumber(num) {
  if (num === undefined || num === null) return 'N/A';
  return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(2);
}

function buildLatencyChart(aggregate) {
  const latencies = [
    { label: 'Min', value: aggregate.latency.min },
    { label: 'p50', value: aggregate.latency.p50 },
    { label: 'p90', value: aggregate.latency.p90 },
    { label: 'p95', value: aggregate.latency.p95 },
    { label: 'p99', value: aggregate.latency.p99 },
    { label: 'Max', value: aggregate.latency.max }
  ];

  const maxVal = aggregate.latency.max || 1;
  let html = '';

  for (const { label, value } of latencies) {
    const percentage = ((value || 0) / maxVal) * 100;
    html += '<div class="chart-bar">'
         + '<div class="chart-label">' + label + '</div>'
         + '<div class="chart-bar-container">'
         + '<div class="chart-bar-fill" style="width: ' + percentage + '%"></div>'
         + '</div>'
         + '<div class="chart-value">' + formatNumber(value) + 'ms</div>'
         + '</div>';
  }

  return html;
}

function buildResponseCodes(aggregate) {
  if (!aggregate.codes) return '<p>No response codes recorded.</p>';

  let html = '<table><thead><tr><th>Status Code</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
  const entries = Object.entries(aggregate.codes).sort((a, b) => b[1] - a[1]);

  for (const [code, count] of entries) {
    const percentage = ((count / aggregate.requestsCompleted) * 100).toFixed(2);
    html += '<tr>'
         + '<td><strong>' + code + '</strong></td>'
         + '<td>' + formatNumber(count) + '</td>'
         + '<td>' + percentage + '%</td>'
         + '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

function buildErrors(aggregate) {
  if (!aggregate.errors || Object.keys(aggregate.errors).length === 0) {
    return '<p>No errors detected.</p>';
  }

  let html = '<table><thead><tr><th>Error Type</th><th>Count</th></tr></thead><tbody>';
  const entries = Object.entries(aggregate.errors).sort((a, b) => b[1] - a[1]);

  for (const [error, count] of entries) {
    html += '<tr>'
         + '<td><strong>' + error + '</strong></td>'
         + '<td>' + formatNumber(count) + '</td>'
         + '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

function generateHTML(data) {
  const { aggregate } = data;

  const statusP95 = aggregate.latency.p95 < 100 ? 'Excellent'
                   : aggregate.latency.p95 < 500 ? 'Good'
                   : 'Needs Work';

  const statusP99 = aggregate.latency.p99 < 200 ? 'Excellent'
                   : aggregate.latency.p99 < 1000 ? 'Good'
                   : 'Needs Work';

  const failedCount = aggregate.requestsFailed || 0;
  const statusErrors = failedCount === 0 ? 'Perfect'
                      : failedCount < 10 ? 'Acceptable'
                      : 'Too High';

  const recommendP95 = aggregate.latency.p95 > 1000
    ? 'Implement caching (Redis) to reduce database queries'
    : 'Performance is acceptable';

  const recommendP99 = aggregate.latency.p99 > 2000
    ? 'Consider connection pooling or query optimization'
    : 'Tail latency is healthy';

  const recommendErrors = failedCount > 0
    ? 'Check MongoDB connection and query performance'
    : 'No errors detected';

  const css = ''
    + '* { margin: 0; padding: 0; box-sizing: border-box; }'
    + 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'
    + '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);'
    + '  min-height: 100vh; padding: 40px 20px; }'
    + '.container { max-width: 1200px; margin: 0 auto; background: white;'
    + '  border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }'
    + '.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);'
    + '  color: white; padding: 40px; text-align: center; }'
    + '.header h1 { font-size: 2.5em; margin-bottom: 10px; }'
    + '.header p { font-size: 1.1em; opacity: 0.9; }'
    + '.content { padding: 40px; }'
    + '.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));'
    + '  gap: 20px; margin-bottom: 40px; }'
    + '.metric-card { background: #f8f9fa; border-left: 4px solid #667eea;'
    + '  padding: 20px; border-radius: 8px; transition: transform 0.3s; }'
    + '.metric-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); }'
    + '.metric-label { font-size: 0.85em; color: #666; text-transform: uppercase;'
    + '  letter-spacing: 1px; margin-bottom: 8px; }'
    + '.metric-value { font-size: 1.8em; font-weight: bold; color: #333; }'
    + '.metric-unit { font-size: 0.7em; color: #999; margin-left: 5px; }'
    + '.section { margin-bottom: 40px; }'
    + '.section-title { font-size: 1.5em; font-weight: 600; color: #333;'
    + '  margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }'
    + 'table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }'
    + 'thead { background: #f3f4f6; border-bottom: 2px solid #e5e7eb; }'
    + 'th { text-align: left; padding: 12px; font-weight: 600; color: #374151; font-size: 0.9em; }'
    + 'td { padding: 12px; border-bottom: 1px solid #e5e7eb; }'
    + 'tbody tr:hover { background: #f9fafb; }'
    + '.latency-chart { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }'
    + '.chart-bar { display: flex; align-items: center; margin-bottom: 15px; }'
    + '.chart-label { width: 80px; font-weight: 600; color: #333; }'
    + '.chart-bar-container { flex: 1; height: 30px; background: #e5e7eb;'
    + '  border-radius: 4px; overflow: hidden; margin: 0 15px; }'
    + '.chart-bar-fill { height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);'
    + '  border-radius: 4px; transition: width 0.3s; }'
    + '.chart-value { min-width: 80px; text-align: right; font-weight: 600; color: #333; }'
    + '.footer { background: #f3f4f6; padding: 20px 40px; text-align: center; color: #666; font-size: 0.9em; }'
    + '.timestamp { color: #999; margin-top: 20px; }';

  const parts = [];
  parts.push('<!DOCTYPE html>');
  parts.push('<html lang="en"><head><meta charset="UTF-8">');
  parts.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
  parts.push('<title>Artillery Load Test Report</title>');
  parts.push('<style>' + css + '</style></head><body>');
  parts.push('<div class="container">');
  parts.push('<div class="header"><h1>Artillery Load Test Report</h1>');
  parts.push('<p>Multi-Tenant Widget API - Baseline Performance Analysis</p></div>');
  parts.push('<div class="content">');

  // Metrics grid
  parts.push('<div class="metrics-grid">');
  parts.push('<div class="metric-card"><div class="metric-label">Requests/sec</div><div class="metric-value">' + formatNumber(aggregate.rps.mean) + '</div></div>');
  parts.push('<div class="metric-card"><div class="metric-label">Mean Latency</div><div class="metric-value">' + formatNumber(aggregate.latency.mean) + '<span class="metric-unit">ms</span></div></div>');
  parts.push('<div class="metric-card"><div class="metric-label">P95 Latency</div><div class="metric-value">' + formatNumber(aggregate.latency.p95) + '<span class="metric-unit">ms</span></div></div>');
  parts.push('<div class="metric-card"><div class="metric-label">P99 Latency</div><div class="metric-value">' + formatNumber(aggregate.latency.p99) + '<span class="metric-unit">ms</span></div></div>');
  parts.push('<div class="metric-card"><div class="metric-label">Total Requests</div><div class="metric-value">' + formatNumber(aggregate.requestsCompleted) + '</div></div>');
  parts.push('<div class="metric-card"><div class="metric-label">Failed Requests</div><div class="metric-value">' + formatNumber(failedCount) + '</div></div>');
  parts.push('</div>');

  // Latency chart
  parts.push('<div class="section"><h2 class="section-title">Latency Percentiles (ms)</h2>');
  parts.push('<div class="latency-chart">' + buildLatencyChart(aggregate) + '</div></div>');

  // Detailed metrics
  parts.push('<div class="section"><h2 class="section-title">Detailed Metrics</h2>');
  parts.push('<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>');
  parts.push('<tr><td>Requests Completed</td><td>' + formatNumber(aggregate.requestsCompleted) + '</td></tr>');
  parts.push('<tr><td>Requests Failed</td><td>' + formatNumber(failedCount) + '</td></tr>');
  parts.push('<tr><td>Mean RPS</td><td>' + formatNumber(aggregate.rps.mean) + '</td></tr>');
  parts.push('<tr><td>Data Sent (KB)</td><td>' + ((aggregate.bytesSent || 0) / 1024).toFixed(2) + '</td></tr>');
  parts.push('<tr><td>Data Received (KB)</td><td>' + ((aggregate.bytesReceived || 0) / 1024).toFixed(2) + '</td></tr>');
  parts.push('<tr><td>Concurrency</td><td>' + formatNumber(aggregate.concurrency) + '</td></tr>');
  parts.push('</tbody></table></div>');

  // Response codes
  parts.push('<div class="section"><h2 class="section-title">Response Codes</h2>' + buildResponseCodes(aggregate) + '</div>');

  // Errors
  parts.push('<div class="section"><h2 class="section-title">Errors</h2>' + buildErrors(aggregate) + '</div>');

  // Recommendations
  parts.push('<div class="section"><h2 class="section-title">Performance Analysis & Recommendations</h2>');
  parts.push('<table><thead><tr><th>Metric</th><th>Status</th><th>Recommendation</th></tr></thead><tbody>');
  parts.push('<tr><td>P95 Latency (' + formatNumber(aggregate.latency.p95) + 'ms)</td><td>' + statusP95 + '</td><td>' + recommendP95 + '</td></tr>');
  parts.push('<tr><td>P99 Latency (' + formatNumber(aggregate.latency.p99) + 'ms)</td><td>' + statusP99 + '</td><td>' + recommendP99 + '</td></tr>');
  parts.push('<tr><td>Failed Requests (' + formatNumber(failedCount) + ')</td><td>' + statusErrors + '</td><td>' + recommendErrors + '</td></tr>');
  parts.push('</tbody></table></div>');

  parts.push('</div>');
  parts.push('<div class="footer"><p>Generated by Artillery Load Test Reporter</p>');
  parts.push('<p class="timestamp">' + new Date().toLocaleString() + '</p></div>');
  parts.push('</div></body></html>');

  return parts.join('\n');
}

function main() {
  try {
    console.log('Reading Artillery JSON report...');

    if (!fs.existsSync(JSON_REPORT)) {
      console.error('Error: ' + JSON_REPORT + ' not found');
      console.error('Run: npm run load-test');
      process.exit(1);
    }

    const jsonData = JSON.parse(fs.readFileSync(JSON_REPORT, 'utf-8'));
    console.log('JSON report loaded');

    const html = generateHTML(jsonData);
    fs.writeFileSync(HTML_REPORT, html, 'utf-8');

    console.log('HTML report generated: ' + HTML_REPORT);
    console.log('Open in browser: file://' + path.resolve(HTML_REPORT));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
