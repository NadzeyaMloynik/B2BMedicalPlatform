import { useEffect, useRef, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { ErrorEvent, onError } from '@/lib/errorBus';

interface ToastItem extends ErrorEvent {
  id: string;
  time: number;
}

const ErrorToasts = () => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idSeq = useRef<number>(0);

  useEffect(() => {
    const unsub = onError((e) => {
      setItems((prev) => {
        idSeq.current += 1;
        const id = `${Date.now()}-${idSeq.current}`;
        return [...prev, { ...e, id, time: Date.now() }];
      });
    });
    return () => {
      unsub();
    };
  }, []);

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id)); // ← исправлено

  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 2000 }}>
      {items.map((t) => (
        <Toast key={t.id} onClose={() => remove(t.id)} bg="danger" delay={6000} autohide>
          <Toast.Header closeButton>
            <strong className="me-auto">Ошибка</strong>
            {t.status && <small>HTTP {t.status}</small>}
          </Toast.Header>
          <Toast.Body className="text-white" style={{ whiteSpace: 'pre-wrap' }}>
            {t.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default ErrorToasts;
