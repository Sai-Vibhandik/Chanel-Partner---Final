import { useState } from 'react';

/**
 * TableWrapper - Responsive table component
 *
 * On mobile, can either:
 * 1. Show horizontal scroll (default)
 * 2. Show as cards if mobileCardView is true
 *
 * Props:
 * - mobileCardView: boolean - if true, shows cards on mobile instead of scrollable table
 * - columns: array - column definitions for mobile card view [{ key, label, format }]
 */
const TableWrapper = ({
  children,
  className = '',
  mobileCardView = false,
  columns = [],
  data = [],
  idKey = '_id'
}) => {
  const [viewMode, setViewMode] = useState('table');

  // If mobileCardView is enabled and we're on mobile, show cards
  // Otherwise, show scrollable table
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Mobile view toggle (only if mobileCardView is enabled) */}
      {mobileCardView && (
        <div className="lg:hidden px-4 py-3 border-b border-gray-100 flex gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              viewMode === 'table'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              viewMode === 'cards'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Cards
          </button>
        </div>
      )}

      {/* Table view - scrollable on mobile */}
      <div className={`${viewMode === 'table' ? 'block' : 'hidden lg:block'}`}>
        <div className="overflow-x-auto">
          <table className={`w-full ${className}`}>
            {children}
          </table>
        </div>
      </div>

      {/* Card view for mobile */}
      {mobileCardView && viewMode === 'cards' && (
        <div className="lg:hidden divide-y divide-gray-100">
          {data.map((row, index) => (
            <div key={row[idKey] || index} className="p-4 hover:bg-gray-50">
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-500">{col.label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">
                    {col.render ? col.render(row) : (row[col.key] ?? '-')}
                  </span>
                </div>
              ))}
            </div>
          ))}
          {data.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * TableHeader - Responsive table header
 */
export const TableHeader = ({ children, className = '' }) => (
  <thead className={`bg-gray-50 ${className}`}>
    {children}
  </thead>
);

/**
 * TableBody - Table body wrapper
 */
export const TableBody = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-gray-200 ${className}`}>
    {children}
  </tbody>
);

/**
 * TableRow - Table row with hover effect
 */
export const TableRow = ({ children, className = '', onClick }) => (
  <tr
    className={`hover:bg-gray-50 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </tr>
);

/**
 * TableCell - Table cell with responsive padding
 */
export const TableCell = ({ children, className = '', align = 'left' }) => (
  <td className={`px-4 sm:px-6 py-3 sm:py-4 text-sm ${align === 'right' ? 'text-right' : ''} ${className}`}>
    {children}
  </td>
);

/**
 * TableHeaderCell - Table header cell
 */
export const TableHeaderCell = ({ children, className = '', sortable = false, sorted = false }) => (
  <th className={`px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
    <div className="flex items-center gap-1">
      {children}
      {sortable && (
        <svg className={`w-4 h-4 ${sorted ? 'text-gray-700' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )}
    </div>
  </th>
);

/**
 * EmptyState - Empty state for tables
 */
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="p-6 sm:p-8 text-center">
    {icon && (
      <div className="flex justify-center mb-4">
        {icon}
      </div>
    )}
    {title && <p className="text-gray-500 mb-2">{title}</p>}
    {description && <p className="text-sm text-gray-400 mb-4">{description}</p>}
    {action}
  </div>
);

export default TableWrapper;