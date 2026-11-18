import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { X } from 'lucide-react';

export function Modal({
  title,
  close,
  children,
  restoreFocus,
  className = '',
}: {
  title: string;
  restoreFocus: RefObject<HTMLElement | null>;
  close: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = restoreFocus.current ?? (document.activeElement as HTMLElement);
    ref.current?.focus();
    return () => {
      requestAnimationFrame(() => {
        if (!document.querySelector('[aria-modal="true"]') && before?.isConnected) before.focus();
      });
    };
  }, [restoreFocus]);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
          if (event.key === 'Tab') {
            const elements = Array.from(
              ref.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,select,textarea,[tabindex="0"]',
              ) || [],
            );
            const first = elements[0],
              last = elements.at(-1);
            if (
              event.shiftKey &&
              (document.activeElement === first || document.activeElement === ref.current)
            ) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <button className="modal-close" aria-label="대화상자 닫기" onClick={close}>
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
