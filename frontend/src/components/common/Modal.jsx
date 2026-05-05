import { useEffect } from 'react';

/**
 * Modal - Responsive modal component
 *
 * On mobile: Full screen with scroll
 * On tablet/desktop: Centered modal with max-width
 *
 * Props:
 * - isOpen: boolean - controls visibility
 * - onClose: function - called when modal should close
 * - title: string - modal title
 * - size: 'sm' | 'md' | 'lg' | 'xl' | 'full' - modal width
 * - showClose: boolean - show close button in header
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  className = ''
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal container - scrollable on mobile */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Modal content */}
        <div
          className={`
            relative w-full bg-white rounded-t-2xl sm:rounded-xl shadow-xl
            transform transition-all
            ${sizeStyles[size]}
            ${className}
          `}
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          {(title || showClose) && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {showClose && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content - scrollable if needed */}
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ModalContent - Content wrapper with padding
 */
export const ModalContent = ({ children, className = '' }) => (
  <div className={`px-4 sm:px-6 py-4 ${className}`}>
    {children}
  </div>
);

/**
 * ModalFooter - Footer with action buttons
 */
export const ModalFooter = ({ children, className = '' }) => (
  <div className={`px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:justify-end ${className}`}>
    {children}
  </div>
);

/**
 * ModalButton - Pre-styled button for modals
 */
export const ModalButton = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = ''
}) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-medium transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        w-full sm:w-auto
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default Modal;