"use client";
import React, { useEffect, useRef } from 'react';
import FocusTrap from 'focus-trap-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId?: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
  labelledBy?: string;
  className?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  children,
  titleId = 'modal-title',
  initialFocusRef,
  labelledBy,
  className = ''
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <FocusTrap active={isOpen} focusTrapOptions={{
        initialFocus: initialFocusRef?.current || undefined,
        escapeDeactivates: false
      }}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy || titleId}
          className={`bg-white w-full max-h-[90vh] overflow-hidden rounded-lg shadow-xl flex flex-col ${className}`}
        >
          {children}
        </div>
      </FocusTrap>
    </div>
  );
};
