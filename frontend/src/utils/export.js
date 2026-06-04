/**
 * Export utilities for downloading data in various formats
 */
import * as XLSX from 'xlsx';

/**
 * Format currency for export
 */
export const formatCurrencyExport = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined) return '';
  const symbol = currency === 'AED' ? 'AED ' : 'Rs ';
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

/**
 * Format time string (HH:MM) for export - converts to AM/PM format
 */
export const formatTimeStringExport = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
};

/**
 * Helper to get value from column definition
 * @param {Object} item - The data item
 * @param {Object} col - Column definition
 * @returns {*} The formatted value
 */
const getColumnValue = (item, col) => {
  let value;

  // Use custom format function if provided
  if (col.format && typeof col.format === 'function') {
    value = col.format(item);
  } else if (col.key) {
    value = col.key.split('.').reduce((obj, key) => obj?.[key], item);
  }

  // Handle string format values (for backward compatibility)
  if (col.format && typeof col.format === 'string') {
    switch (col.format) {
      case 'date':
        value = formatDateExport(value);
        break;
      case 'datetime':
        value = formatDateTimeExport(value);
        break;
      case 'currency':
        value = formatCurrencyExport(value);
        break;
    }
  }

  return value;
};

/**
 * Convert data to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions [{key, header, format}]
 * @returns {string} CSV string
 */
export const toCSV = (data, columns) => {
  if (!data || data.length === 0) return '';

  const headers = columns.map(col => col.header);
  const rows = data.map(item =>
    columns.map(col => {
      let value = getColumnValue(item, col);

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
 * Convert data to Excel workbook using xlsx library
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions [{key, header, format}]
 * @param {string} title - Title for the spreadsheet
 * @returns {Object} XLSX workbook
 */
export const toExcel = (data, columns, title = 'Export') => {
  if (!data || data.length === 0) return null;

  // Create headers row
  const headers = columns.map(col => col.header);

  // Create data rows
  const rows = data.map(item =>
    columns.map(col => {
      let value = getColumnValue(item, col);

      if (value === null || value === undefined) value = '';
      if (value instanceof Date) value = value.toLocaleDateString();

      return value;
    })
  );

  // Combine headers and data
  const sheetData = [headers, ...rows];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths based on header length
  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length, 15)
  }));
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31)); // Sheet name max 31 chars

  return wb;
};

/**
 * Download data as Excel file
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions
 * @param {string} filename - Name of the file (without extension)
 * @param {string} title - Title for the spreadsheet
 */
export const downloadExcel = (data, columns, filename = 'export', title = 'Export') => {
  const wb = toExcel(data, columns, title);
  if (wb) {
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
};

export default {
  toCSV,
  downloadCSV,
  toExcel,
  downloadExcel,
  formatCurrencyExport,
  formatDateExport,
  formatDateTimeExport,
  formatTimeStringExport
};