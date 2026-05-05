/**
 * Export utilities for downloading data in various formats
 */

/**
 * Convert data to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions [{key, header}]
 * @returns {string} CSV string
 */
export const toCSV = (data, columns) => {
  if (!data || data.length === 0) return '';

  const headers = columns.map(col => col.header);
  const rows = data.map(item =>
    columns.map(col => {
      let value = col.key.split('.').reduce((obj, key) => obj?.[key], item);

      // Handle null/undefined
      if (value === null || value === undefined) value = '';

      // Format dates
      if (value instanceof Date) {
        value = value.toLocaleDateString();
      }

      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""');
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          value = `"${value}"`;
        }
      }

      return value;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions
 * @param {string} filename - Name of the file (without extension)
 */
export const downloadCSV = (data, columns, filename = 'export') => {
  const csv = toCSV(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Convert data to Excel format (simple HTML table that Excel can open)
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions
 * @param {string} title - Title for the spreadsheet
 * @returns {string} HTML table string
 */
export const toExcel = (data, columns, title = 'Export') => {
  if (!data || data.length === 0) return '';

  const headerRow = columns.map(col => `<th style="background-color: #4F46E5; color: white; padding: 8px; font-weight: bold;">${col.header}</th>`).join('');

  const dataRows = data.map(item => {
    return `<tr>${columns.map(col => {
      let value = col.key.split('.').reduce((obj, key) => obj?.[key], item);
      if (value === null || value === undefined) value = '';
      if (value instanceof Date) value = value.toLocaleDateString();
      return `<td style="padding: 6px; border: 1px solid #ddd;">${value}</td>`;
    }).join('')}</tr>`;
  }).join('');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <h2 style="text-align: center; margin-bottom: 20px;">${title}</h2>
      <table>
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${dataRows}</tbody>
      </table>
    </body>
    </html>
  `;
};

/**
 * Download data as Excel file
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions
 * @param {string} filename - Name of the file (without extension)
 * @param {string} title - Title for the spreadsheet
 */
export const downloadExcel = (data, columns, filename = 'export', title = 'Export') => {
  const excel = toExcel(data, columns, title);
  const blob = new Blob([excel], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Format currency for export
 */
export const formatCurrencyExport = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined) return '';
  const symbol = currency === 'AED' ? 'AED ' : '₹';
  if (amount >= 10000000) {
    return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `${symbol}${(amount / 100000).toFixed(2)} Lac`;
  }
  return `${symbol}${amount.toLocaleString()}`;
};

/**
 * Format date for export
 */
export const formatDateExport = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format datetime for export
 */
export const formatDateTimeExport = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default {
  toCSV,
  downloadCSV,
  toExcel,
  downloadExcel,
  formatCurrencyExport,
  formatDateExport,
  formatDateTimeExport
};