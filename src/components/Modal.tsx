import React, { useEffect, useRef, ReactNode } from 'react';
import { FocusTrap, handleKeyboardNavigation } from '../utils/accessibility';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Create and activate focus trap
      focusTrapRef.current = new FocusTrap(modalRef.current);
      focusTrapRef.current.activate();

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Set aria-hidden on other elements
      const otherElements = document.querySelectorAll('body > *:not([data-modal])');
      otherElements.forEach(element => {
        element.setAttribute('aria-hidden', 'true');
      });
    }

    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
      }
      
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Remove aria-hidden from other elements
      const otherElements = document.querySelectorAll('body > *:not([data-modal])');
      otherElements.forEach(element => {
        element.removeAttribute('aria-hidden');
      });
    };
  }, [isOpen]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    handleKeyboardNavigation(event, undefined, undefined, onClose);
  };

  if (!isOpen) return null;

  return (
    <div
      data-modal
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          ref={modalRef}
          className={`
            relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all 
            sm:my-8 sm:w-full ${sizeClasses[size]} ${className}
          `}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 
                id="modal-title"
                className="text-lg font-medium leading-6 text-gray-900"
              >
                {title}
              </h3>
              <button
                type="button"
                className="btn-secondary text-gray-400 hover:text-gray-600 focus:ring-accessible"
                onClick={onClose}
                aria-label="Close modal"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="prose-accessible">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
