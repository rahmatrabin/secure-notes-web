import { useEffect, useId, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { errorMessage, pageUrl, request, RequestError, type Page } from './api';

type PasswordFieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'name' | 'type'> & {
  label: string;
  help?: string;
};

export function PasswordField({ label, help, ...inputProps }: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? 'Hide password' : 'Show password';

  return <div className="password-field">
    <label htmlFor={id}>{label}</label>
    <div className="password-control">
      <input
        {...inputProps}
        id={id}
        name="password"
        type={visible ? 'text' : 'password'}
        aria-describedby={help ? id + '-help' : undefined}
      />
      <button
        type="button"
        aria-label={toggleLabel}
        title={toggleLabel}
        aria-controls={id}
        onClick={() => setVisible(value => !value)}
      >
        <span aria-hidden="true">👁</span>
      </button>
    </div>
    {help && <small id={id + '-help'}>{help}</small>}
  </div>;
}

export function Feedback({ error }: { error: string }) {
  return error ? <p className="error" role="alert">{error}</p> : null;
}

export function useAction(onExpired?: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      if (onExpired && error instanceof RequestError && error.status === 401) onExpired();
      else setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

export function Listing<T, P extends Page<T> = Page<T>>({
  path, token, version = 0, onExpired, children
}: {
  path: string; token?: string; version?: number; onExpired?: () => void; children: (page: P) => ReactNode;
}) {
  const [positions, setPositions] = useState<(string | null)[]>([null]);
  const [loaded, setLoaded] = useState<{ key: string; data?: P; error?: string }>();
  const [retry, setRetry] = useState(0);
  const cursor = positions[positions.length - 1];
  const url = pageUrl(path, cursor);
  const key = JSON.stringify([url, version, retry]);

  useEffect(() => {
    const controller = new AbortController();
    request<P>(url, { token, signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setLoaded({ key, data });
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (onExpired && error instanceof RequestError && error.status === 401) onExpired();
      else setLoaded({ key, error: errorMessage(error) });
    });
    return () => controller.abort();
  }, [url, key, token, onExpired]);

  const current = loaded?.key === key ? loaded : undefined;
  const data = current?.data;
  return <>
    {!current && <p role="status">Loading…</p>}
    {current?.error && <>
      <Feedback error={current.error} />
      <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button>
    </>}
    {data && children(data)}
    {(positions.length > 1 || data?.nextCursor) && <nav className="pager" aria-label="Pagination">
      <button type="button" disabled={positions.length === 1 || !current}
        onClick={() => setPositions(value => value.slice(0, -1))}>Previous</button>
      <span>Page {positions.length}</span>
      <button type="button" disabled={!data?.nextCursor}
        onClick={() => setPositions(value => [...value, data!.nextCursor])}>Next</button>
    </nav>}
  </>;
}

export function TextEditor({ initial, label, busy, onCancel, onSave, bodyRequired }: {
  initial?: { title: string; body: string };
  label: string; busy: boolean; bodyRequired?: boolean;
  onCancel?: () => void; onSave: (values: { title: string; body: string }) => void;
}) {
  return <form className="form" onSubmit={event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({ title: String(form.get('title')), body: String(form.get('body')) });
  }}>
    <label>Title<input name="title" required maxLength={160} defaultValue={initial?.title} /></label>
    <label>Body<textarea name="body" rows={4} maxLength={10000} required={bodyRequired} defaultValue={initial?.body} /></label>
    <div className="actions">
      <button className="primary" disabled={busy}>{label}</button>
      {onCancel && <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>}
    </div>
  </form>;
}
