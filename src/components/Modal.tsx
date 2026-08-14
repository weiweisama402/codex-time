import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  title,
  children,
  onClose
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    window.history.pushState({ shihengSheet: true }, '');
    const onPop = () => onClose();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && window.history.back();
    window.addEventListener('popstate', onPop, { once: true });
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  const close = () => {
    if (window.history.state?.shihengSheet) window.history.back();
    else onClose();
  };
  return (
    <div
      className="modal-layer"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header>
          <h2 id="modal-title">{title}</h2>
          <button ref={closeRef} className="icon-button" onClick={close} aria-label="关闭">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
