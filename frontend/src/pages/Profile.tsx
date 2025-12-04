import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tabs, Tab } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { jwtDecode } from 'jwt-decode';

interface UserProfile {
  id: number;
  name: string;
  surname: string;
  birthDate: string;
  email: string;
}

interface PasswordChangeData {
  oldPassword: string;
  newPassword: string;
  repeatPassword: string;
}

interface ProfileUpdateData {
  name: string;
  surname: string;
  birthDate: string;
  email: string;
}

const Profile: React.FC = () => {
  const { accessToken, email: userEmail } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // Profile update state
  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    name: '',
    surname: '',
    birthDate: '',
    email: ''
  });
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password change state
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    oldPassword: '',
    newPassword: '',
    repeatPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Password visibility state
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  // Get user data from JWT token
  const getUserData = () => {
    if (!accessToken) return { id: null, email: null };
    try {
      const decoded: any = jwtDecode(accessToken);
      const id = decoded.sub ? parseInt(decoded.sub) : decoded.userId || null;
      const email = decoded.sub || decoded.email || decoded.username || null;
      return { id, email };
    } catch {
      return { id: null, email: null };
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { email: userEmail } = getUserData();
      console.log('User email from token:', userEmail);
      
      if (!userEmail) throw new Error('User email not found in token');

      // Fetch user data using profile endpoint
      console.log('Making API request to:', '/user-service/users/profile', 'with email:', userEmail);
      const response = await api.get('/user-service/users/profile', {
        params: {
          email: userEmail
        }
      });
      
      console.log('API response:', response.data);
      const userData = response.data;
      
      const userProfile = {
        id: userData.id,
        name: userData.name || '',
        surname: userData.surname || '',
        birthDate: userData.birthDate || '',
        email: userData.email || userEmail
      };
      
      console.log('Processed user profile:', userProfile);
      
      setProfile(userProfile);
      setProfileData({
        name: userProfile.name,
        surname: userProfile.surname,
        birthDate: userProfile.birthDate,
        email: userProfile.email
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
      
      // Fallback to JWT data if API call fails
      const { email: userEmail } = getUserData();
      if (userEmail) {
        const fallbackProfile = {
          id: 0,
          name: '',
          surname: '',
          birthDate: '',
          email: userEmail
        };
        setProfile(fallbackProfile);
        setProfileData({
          name: fallbackProfile.name,
          surname: fallbackProfile.surname,
          birthDate: fallbackProfile.birthDate,
          email: fallbackProfile.email
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileLoading(true);

    try {
      if (!profile?.id) throw new Error('User ID not found');

      await api.put(`/user-service/users/${profile.id}`, profileData);
      setProfileMessage({ type: 'success', text: 'Профиль успешно обновлен' });
      loadProfile(); // Reload profile data
    } catch (error: any) {
      setProfileMessage({
        type: 'danger',
        text: error?.response?.data?.message || 'Ошибка при обновлении профиля'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.repeatPassword) {
      setPasswordMessage({ type: 'danger', text: 'Новые пароли не совпадают' });
      return;
    }

    setPasswordLoading(true);

    try {
      // Use email from profile or from AuthContext as fallback
      const email = profile?.email || userEmail;
      if (!email) throw new Error('User email not found');

      // Map to correct DTO structure for backend
      const refreshPasswordData = {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        repeatPassword: passwordData.repeatPassword
      };
      
      await api.put(`auth/password/${email}`, refreshPasswordData);
      setPasswordMessage({ type: 'success', text: 'Пароль успешно изменен' });
      setPasswordData({ oldPassword: '', newPassword: '', repeatPassword: '' });
    } catch (error: any) {
      setPasswordMessage({
        type: 'danger',
        text: error?.response?.data?.message || 'Ошибка при смене пароля'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Container>
          <div className="content-card text-center py-5">
            <div className="spinner-border mb-3" style={{ color: '#42acef' }} role="status">
              <span className="visually-hidden">Загрузка...</span>
            </div>
            <div className="h5">Загрузка профиля...</div>
          </div>
        </Container>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container">
        <Container>
          <div className="content-card text-center py-5">
            <div className="text-danger mb-3">
              <i className="bi bi-exclamation-triangle" style={{ fontSize: '3rem' }}></i>
            </div>
            <div className="h5 mb-3">Не удалось загрузить профиль</div>
            <Button className="btn-brand" onClick={loadProfile}>
              Попробовать ещё раз
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Container>
        <div className="page-header">
          <h2 className="page-title mb-1">Личный кабинет</h2>
          <p className="mb-0 opacity-75">Управление личной информацией и настройками аккаунта</p>
        </div>
        
        <Row>
          <Col lg={8} xl={9}>
            <div className="content-card">
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k || 'info')}
                className="mb-3"
              >
                <Tab eventKey="info" title="Информация">
                  <Form onSubmit={handleProfileUpdate}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Имя *</Form.Label>
                          <Form.Control
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            maxLength={100}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Фамилия *</Form.Label>
                          <Form.Control
                            type="text"
                            value={profileData.surname}
                            onChange={(e) => setProfileData({ ...profileData, surname: e.target.value })}
                            maxLength={150}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Дата рождения *</Form.Label>
                      <Form.Control
                        type="date"
                        value={profileData.birthDate}
                        onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        required
                      />
                      <Form.Text className="text-muted">
                        Дата должна быть в прошлом
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        maxLength={255}
                        required
                      />
                    </Form.Group>

                    {profileMessage && (
                      <Alert variant={profileMessage.type}>
                        {profileMessage.text}
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="btn-brand"
                      disabled={profileLoading}
                    >
                      {profileLoading ? 'Сохранение...' : 'Сохранить изменения'}
                    </Button>
                  </Form>
                </Tab>

                <Tab eventKey="password" title="Смена пароля">
                  <Form onSubmit={handlePasswordChange}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Текущий пароль</Form.Label>
                          <div className="position-relative">
                            <Form.Control
                              type={showOldPassword ? "text" : "password"}
                              value={passwordData.oldPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                              required
                            />
                            <Button
                              variant="link"
                              className="position-absolute top-50 end-0 translate-middle-y p-0 me-2"
                              onClick={() => setShowOldPassword(!showOldPassword)}
                              style={{ border: 'none', background: 'none' }}
                            >
                              <i className={`bi ${showOldPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ color: '#6c757d' }} />
                            </Button>
                          </div>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Новый пароль</Form.Label>
                          <div className="position-relative">
                            <Form.Control
                              type={showNewPassword ? "text" : "password"}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              required
                            />
                            <Button
                              variant="link"
                              className="position-absolute top-50 end-0 translate-middle-y p-0 me-2"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              style={{ border: 'none', background: 'none' }}
                            >
                              <i className={`bi ${showNewPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ color: '#6c757d' }} />
                            </Button>
                          </div>
                          <Form.Text className="text-muted small">
                            Мин 8 симв, заглавная + цифра
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Повторите пароль</Form.Label>
                          <div className="position-relative">
                            <Form.Control
                              type={showRepeatPassword ? "text" : "password"}
                              value={passwordData.repeatPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, repeatPassword: e.target.value })}
                              required
                            />
                            <Button
                              variant="link"
                              className="position-absolute top-50 end-0 translate-middle-y p-0 me-2"
                              onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                              style={{ border: 'none', background: 'none' }}
                            >
                              <i className={`bi ${showRepeatPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ color: '#6c757d' }} />
                            </Button>
                          </div>
                        </Form.Group>
                      </Col>
                    </Row>

                    {passwordMessage && (
                      <Alert variant={passwordMessage.type}>
                        {passwordMessage.text}
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      variant="danger"
                      disabled={passwordLoading}
                      style={{ borderRadius: '6px' }}
                    >
                      {passwordLoading ? 'Смена пароля...' : 'Сменить пароль'}
                    </Button>
                  </Form>
                </Tab>
              </Tabs>
            </div>
          </Col>
          
          <Col lg={4} xl={3}>
            <div className="content-card">
              <h5 className="mb-3">Информация о профиле</h5>
              {profile && (
                <div>
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" 
                           style={{ width: '40px', height: '40px' }}>
                        <span className="text-white fw-bold">
                          {(profile.name?.charAt(0) || '').toUpperCase()}{(profile.surname?.charAt(0) || '').toUpperCase() || (profile.email?.charAt(0) || '?').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="fw-semibold">
                          {profile.name && profile.surname 
                            ? `${profile.name} ${profile.surname}`
                            : profile.email
                          }
                        </div>
                        <small className="text-muted">{profile.email}</small>
                      </div>
                    </div>
                  </div>
                  
                  <hr />
                  
                  <div className="small text-muted">
                    {profile.birthDate && (
                      <div className="mb-2">
                        <strong>Дата рождения:</strong><br/>
                        {new Date(profile.birthDate).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                    {!profile.birthDate && (
                      <div className="mb-2">
                        <small className="text-muted fst-italic">Данные профиля не заполнены</small>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Profile;