import { useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import api from '@/lib/api';

function ApiExplorer() {
  const [path, setPath] = useState('/api/actuator/health');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const doGet = async () => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      // If user types a full /api/... path, we pass it through; otherwise prefix
      const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`;
      const res = await api.get(finalPath.replace('/api', ''));
      setResult(JSON.stringify(res.data, null, 2));
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>API Explorer</h3>
      <p className="text-muted">Try calling your gateway via the dev proxy.</p>
      <InputGroup className="mb-3">
        <InputGroup.Text>GET</InputGroup.Text>
        <Form.Control
          placeholder="/api/actuator/health or /api/users"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <Button onClick={doGet} disabled={loading} variant="primary">
          {loading ? 'Loading...' : 'Send'}
        </Button>
      </InputGroup>

      {error && (
        <pre className="bg-danger-subtle p-3 border border-danger-subtle rounded small text-danger">
{error}
        </pre>
      )}

      {result && (
        <pre className="bg-body-tertiary p-3 border rounded small overflow-auto" style={{ maxHeight: 400 }}>
{result}
        </pre>
      )}
    </div>
  );
}

export default ApiExplorer;
