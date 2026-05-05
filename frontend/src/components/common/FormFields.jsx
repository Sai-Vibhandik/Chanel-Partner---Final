/**
 * FormField - Responsive form field wrapper
 *
 * Props:
 * - label: string - field label
 * - error: string - error message
 * - hint: string - helper text
 * - required: boolean - show required indicator
 * - fullWidth: boolean - full width on mobile (default true)
 */
export const FormField = ({
  label,
  error,
  hint,
  required,
  children,
  fullWidth = true,
  className = ''
}) => (
  <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

/**
 * Input - Responsive input component
 */
export const Input = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled,
  className = '',
  ...props
}) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className={`
      w-full px-3 sm:px-4 py-2 sm:py-2.5
      text-sm sm:text-base
      border rounded-lg
      transition-colors
      focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
      disabled:bg-gray-100 disabled:cursor-not-allowed
      ${error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200'}
      ${className}
    `}
    {...props}
  />
);

/**
 * Select - Responsive select component
 */
export const Select = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  error,
  disabled,
  className = '',
  ...props
}) => (
  <select
    value={value}
    onChange={onChange}
    disabled={disabled}
    className={`
      w-full px-3 sm:px-4 py-2 sm:py-2.5
      text-sm sm:text-base
      border rounded-lg
      transition-colors
      focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
      disabled:bg-gray-100 disabled:cursor-not-allowed
      ${error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200'}
      ${className}
    `}
    {...props}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

/**
 * Textarea - Responsive textarea component
 */
export const Textarea = ({
  placeholder,
  value,
  onChange,
  rows = 4,
  error,
  disabled,
  className = '',
  ...props
}) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    disabled={disabled}
    className={`
      w-full px-3 sm:px-4 py-2 sm:py-2.5
      text-sm sm:text-base
      border rounded-lg
      transition-colors
      resize-none
      focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
      disabled:bg-gray-100 disabled:cursor-not-allowed
      ${error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-200'}
      ${className}
    `}
    {...props}
  />
);

/**
 * Checkbox - Responsive checkbox with label
 */
export const Checkbox = ({
  label,
  checked,
  onChange,
  disabled,
  id,
  className = ''
}) => (
  <label htmlFor={id} className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50' : ''} ${className}`}>
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
    />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

/**
 * FormRow - Responsive form row (stacks on mobile, side by side on desktop)
 */
export const FormRow = ({ children, cols = 2, className = '' }) => {
  const colStyles = {
    2: 'grid grid-cols-1 sm:grid-cols-2',
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`gap-4 ${colStyles[cols]} ${className}`}>
      {children}
    </div>
  );
};

/**
 * FormActions - Form action buttons (stack on mobile)
 */
export const FormActions = ({ children, className = '' }) => (
  <div className={`flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 ${className}`}>
    {children}
  </div>
);

/**
 * Button - Responsive button component
 */
export const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = ''
}) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300',
    ghost: 'text-gray-600 hover:bg-gray-100'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm sm:text-base',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-lg transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        w-full sm:w-auto
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {icon && !loading && icon}
      {children}
    </button>
  );
};

export default FormField;