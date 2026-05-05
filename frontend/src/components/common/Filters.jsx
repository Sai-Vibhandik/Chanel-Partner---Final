import { useState } from 'react';

/**
 * Filters - Responsive filter section
 *
 * On mobile: Collapsible panel
 * On tablet/desktop: Horizontal flex row
 *
 * Props:
 * - onClear: function - called when clear filters is clicked
 * - hasActiveFilters: boolean - shows clear button if true
 */
const Filters = ({
  children,
  onClear,
  hasActiveFilters = false,
  showToggle = true
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
      {/* Mobile toggle */}
      {showToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full lg:hidden px-4 py-3 flex items-center justify-between text-left"
        >
          <span className="font-medium text-gray-700">Filters</span>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                Active
              </span>
            )}
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      )}

      {/* Filter content */}
      <div className={`${expanded ? 'block' : 'hidden lg:block'}`}>
        <div className="px-4 py-4 lg:px-6 lg:py-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            {children}
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && onClear && (
            <div className="mt-3 pt-3 border-t border-gray-100 lg:pt-0 lg:mt-0 lg:border-0">
              <button
                onClick={onClear}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * SearchInput - Search filter input
 */
export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = ''
}) => (
  <div className={`relative flex-1 min-w-0 sm:min-w-[200px] ${className}`}>
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
    />
  </div>
);

/**
 * FilterSelect - Filter dropdown select
 */
export const FilterSelect = ({
  value,
  onChange,
  options,
  placeholder = 'All',
  label,
  className = ''
}) => (
  <div className={`min-w-[140px] ${className}`}>
    {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

/**
 * FilterDate - Date range filter
 */
export const FilterDate = ({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  className = ''
}) => (
  <div className={`min-w-[160px] ${className}`}>
    {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
    />
  </div>
);

/**
 * FilterDateRange - Date range picker
 */
export const FilterDateRange = ({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  label,
  className = ''
}) => (
  <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
    {label && <span className="text-sm text-gray-500 self-center">{label}</span>}
    <div className="flex gap-2">
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
        placeholder="Start"
      />
      <span className="text-gray-400 self-center">-</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
        placeholder="End"
      />
    </div>
  </div>
);

/**
 * FilterToggle - Toggle filter (active/inactive)
 */
export const FilterToggle = ({
  options,
  value,
  onChange,
  className = ''
}) => (
  <div className={`flex rounded-lg border border-gray-200 overflow-hidden ${className}`}>
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`
          px-3 py-2 text-sm font-medium transition-colors
          ${value === opt.value
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
          }
        `}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default Filters;