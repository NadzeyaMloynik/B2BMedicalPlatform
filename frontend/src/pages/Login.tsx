import { useState } from 'react';
import { Button, Card, Form, Alert, Spinner, Row, Col, Image, InputGroup } from 'react-bootstrap';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import authImage from '@/resources/images/auth.jpg';

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const emailEmpty = submitted && email.trim() === '';
  const passwordEmpty = submitted && password.trim() === '';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side required validation: highlight fields in red only after submit
    setSubmitted(true);
    if (email.trim() === '' || password.trim() === '') {
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/login',
        { email, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      login({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="justify-content-center align-items-start pt-5" style={{ minHeight: '100vh' }}>
      <Col md={12} lg={10} xl={8}>
<Card className="overflow-hidden shadow-sm" style={{ width: '100%', minHeight: '470px' }}>
          <Row className="g-0 align-items-stretch h-100">
            {/* Left side: form */}
            <Col md={6} className="p-5 h-100">
              <Card.Title className="mb-4 fs-3 fw-semibold">Вход</Card.Title>
              <Form onSubmit={onSubmit} className="mt-5">
                <Form.Group className="mb-3">
                  <Form.Label>Почта</Form.Label>
                  <Form.Control
                    className="rounded-pill"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    isInvalid={emailEmpty}
                    placeholder="you@example.com"
                  />
                  <Form.Control.Feedback type="invalid">Введите почту</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Пароль</Form.Label>
                  <InputGroup>
                    <Form.Control
                      className="rounded-start-pill"
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      isInvalid={passwordEmpty}
                      placeholder="••••••••"
                    />
                    <Button
                      className={`rounded-end-pill btn-brand${passwordEmpty ? ' is-invalid' : ''}`}
                      onClick={() => setShowPwd((v) => !v)}
                      type="button"
                      aria-label={showPwd ? 'Скрыть пароль' : 'Показать пароль'}
                    >
                      <i className={showPwd ? 'bi bi-eye-slash' : 'bi bi-eye'} />
                    </Button>
                  </InputGroup>
                  <Form.Control.Feedback type="invalid">Введите пароль</Form.Control.Feedback>
                  {passwordEmpty && (
                    <div className="text-danger small mt-1">Пароль обязателен для входа</div>
                  )}
                </Form.Group>
                {error && <Alert variant="danger">{error}</Alert>}
                <div className="d-flex justify-content-center mt-4">
                  <Button type="submit" disabled={loading} className="btn-brand fw-bold text-white" style={{ width: 200 }}>
                    {loading ? <Spinner size="sm" /> : 'Войти'}
                  </Button>
                </div>
              </Form>
            </Col>

            {/* Right side: image */}
            <Col md={6} className="h-100">
              <div
                style={{
                  width: '100%',
                  height: '470px',
                  backgroundImage: `url(${authImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#f0f2f5'
                }}
              />
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
}

export default Login;
