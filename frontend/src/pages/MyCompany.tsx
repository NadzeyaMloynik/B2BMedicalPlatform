import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table, Offcanvas, OverlayTrigger, Tooltip, Dropdown, Tabs, Tab } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { optimizeImageUrl, uploadToCloudinary, generateLogoFileName, validateImageFile, fileToBase64 } from '@/lib/imageUpload';
import { jwtDecode } from 'jwt-decode';

interface UserDto {
  id: number;
  name: string;
  surname: string;
  birthDate: string;
  email: string;
  availability: boolean;
  role: string;
}

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface CompanyDto {
  id: number;
  name: string;
  type: string;
  address: string;
  contactEmail: string;
  logoUrl: string | null;
  availability: boolean;
  users: UserDto[];
}

interface CompanyUpdateDto {
  name?: string;
  type?: string;
  address?: string;
  contact_email?: string;
  logo_url?: string | null;
}

interface RegisterUserRequestDto {
  registerData: {
    email: string;
    password: string;
    repeatPassword: string;
    roles: string[];
  };
  user: {
    name: string;
    surname: string;
    birthDate: string;
    email: string;
    companyId: number;
    role: string;
  };
}

const defaultCreate = (companyId: number): RegisterUserRequestDto => ({
  registerData: {
    email: '',
    password: '',
    repeatPassword: '',
    roles: ['OPERATOR']
  },
  user: {
    name: '',
    surname: '',
    birthDate: '',
    email: '',
    companyId,
    role: 'OPERATOR'
  }
});

// Generate colorful avatar for user
const generateUserAvatar = (user: UserDto) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D5A6BD'
  ];
  
  const initials = `${(user.name?.charAt(0) || '').toUpperCase()}${(user.surname?.charAt(0) || '').toUpperCase() || (user.email?.charAt(0) || '?').toUpperCase()}`;
  const colorIndex = (user.id % colors.length);
  const backgroundColor = colors[colorIndex];
  
  return {
    initials,
    backgroundColor
  };
};

export default function MyCompany() {
  const { isDirector, accessToken } = useAuth();
  
  const [company, setCompany] = useState<CompanyDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  // Users page state
  const [usersPage, setUsersPage] = useState<Page<UserDto> | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<RegisterUserRequestDto>(defaultCreate(0));

  // Company editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CompanyUpdateDto>({});
  const [updating, setUpdating] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  const loadCompany = async () => {
    setLoading(true);
    setError('');
    try {
      const { email: userEmail } = getUserData();
      if (!userEmail) {
        throw new Error('User email not found in token');
      }

      // Get company by user email using the new endpoint
      const res = await api.get<CompanyDto>(`/user-service/companies/user/${userEmail}`);
      setCompany(res.data);
      setCreateForm(defaultCreate(res.data.id));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load company');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!company) return;
    
    setUsersLoading(true);
    try {
      const params: any = { page, size, companyId: company.id };
      if (onlyAvailable !== undefined) params.availability = onlyAvailable;
      if (debouncedSearchQuery.trim()) params.fullName = debouncedSearchQuery.trim();
      const res = await api.get<Page<UserDto>>('/user-service/users', { params });
      setUsersPage(res.data);
    } catch (e) {
      // errors will be toasted globally
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => { 
    loadCompany(); 
  }, []);
  
  useEffect(() => {
    if (company && activeTab === 'users') {
      loadUsers();
    }
  }, [company, activeTab, page, size, onlyAvailable, debouncedSearchQuery]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(0); // Reset to first page when search changes
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const doCreate = async () => {
    try {
      // Register user through user service
      await api.post('/user-service/users/register', createForm, { headers: { 'Content-Type': 'application/json' } });
      
      setShowCreate(false);
      setCreateForm(defaultCreate(company?.id || 0));
      
      // Reload users list to show the new registered user
      loadUsers();
    } catch (e: any) {
      // error toast will show; also keep drawer open
    }
  };

  const toggleUserAvailability = async (u: UserDto) => {
    const newAvail = !u.availability;
    try {
      await api.patch(`/user-service/users/${u.id}`, null, { params: { availability: newAvail } });
      // Reload users after change
      loadUsers();
    } catch (e: any) {
      // toast will display
    }
  };

  // Company editing functions
  const startEditing = () => {
    if (!company) return;
    setEditForm({
      name: company.name,
      address: company.address,
      contact_email: company.contactEmail,
      logo_url: company.logoUrl
    });
    setLogoPreview(company.logoUrl ? optimizeImageUrl(company.logoUrl) : null);
    setLogoFile(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
    setLogoPreview(null);
    setLogoFile(null);
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    try {
      const base64Preview = await fileToBase64(file);
      setLogoPreview(base64Preview);
      setLogoFile(file);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Ошибка при чтении файла');
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    setEditForm({...editForm, logo_url: null});
  };

  const saveCompanyChanges = async () => {
    if (!company) return;
    
    setUpdating(true);
    let logoUrl = editForm.logo_url;
    
    try {
      // Upload logo if a new file was selected
      if (logoFile) {
        setUploadingLogo(true);
        const fileName = generateLogoFileName(company.name, logoFile.name);
        logoUrl = await uploadToCloudinary(logoFile, fileName);
      }
      
      const updateData = {
        ...editForm,
        logo_url: logoUrl
      };
      
      const res = await api.put<CompanyDto>(`/user-service/companies/${company.id}`, updateData);
      setCompany(res.data);
      setIsEditing(false);
      setEditForm({});
      setLogoPreview(null);
      setLogoFile(null);
    } catch (e: any) {
      // error toast will show
    } finally {
      setUpdating(false);
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="container-fluid">
          <div className="content-card text-center py-5">
            <div className="spinner-border mb-3" style={{ color: '#42acef' }} role="status">
              <span className="visually-hidden">Загрузка...</span>
            </div>
            <div className="h5">Загрузка информации о компании...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="container-fluid">
          <Alert variant="danger" className="content-card">{error}</Alert>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="page-container">
        <div className="container-fluid">
          <Alert variant="warning" className="content-card">
            Информация о компании не найдена
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container-fluid">
        <div className="page-header">
          <div className="d-flex align-items-center gap-3">
            {company.logoUrl && (
              <img 
                src={optimizeImageUrl(company.logoUrl)} 
                alt={`Лого ${company.name}`}
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  objectFit: 'cover', 
                  borderRadius: '12px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div>
              <h1 className="page-title d-flex align-items-center gap-2">
                {company.name} 
                {(() => { 
                  const t = (company.type || '').toUpperCase(); 
                  const label = t === 'ADMIN' ? 'Админ' : t === 'BUYER' ? 'Покупатель' : t === 'SELLER' ? 'Продавец' : (company.type || ''); 
                  const cls = t === 'ADMIN' ? 'badge-pastel-admin' : t === 'BUYER' ? 'badge-pastel-buyer' : t === 'SELLER' ? 'badge-pastel-seller' : 'text-bg-secondary'; 
                  return <span className={`badge ${cls}`}>{label}</span>; 
                })()}
              </h1>
              <div className="mb-2 opacity-90">{company.address}</div>
              <div className="opacity-90">{company.contactEmail}</div>
            </div>
          </div>
        </div>

        <div className="content-card">
          <Tabs 
            activeKey={activeTab} 
            onSelect={(k) => {
              const newTab = k || 'info';
              setActiveTab(newTab);
              // Загружаем данные сотрудников при переходе на вкладку
              if (newTab === 'users' && company) {
                loadUsers();
              }
            }}
            className="mb-3"
          >
            <Tab eventKey="info" title="Информация о компании">
              <div className="py-3">
                {isDirector && (
                  <div className="d-flex justify-content-end mb-3">
                    {!isEditing ? (
                      <Button 
                        className="btn-brand d-flex align-items-center gap-2"
                        onClick={startEditing}
                      >
                        <i className="bi bi-pencil" />
                        Редактировать
                      </Button>
                    ) : (
                      <div className="d-flex gap-2">
                        <Button 
                          className="btn-brand d-flex align-items-center gap-2"
                          onClick={saveCompanyChanges}
                          disabled={updating || uploadingLogo}
                        >
                          {(updating || uploadingLogo) ? (
                            <>
                              <Spinner animation="border" size="sm" />
                              {uploadingLogo ? 'Загрузка...' : 'Сохранение...'}
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check" />
                              Сохранить
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline-secondary" 
                          onClick={cancelEditing}
                          disabled={updating || uploadingLogo}
                        >
                          Отмена
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <Row>
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Body>
                        <h5 className="card-title">Основная информация</h5>
                        {!isEditing ? (
                          <>
                            <div className="mb-2">
                              <strong>Название:</strong> {company.name}
                            </div>
                            <div className="mb-2">
                              <strong>Тип:</strong> {company.type === 'BUYER' ? 'Покупатель' : 'Продавец'}
                            </div>
                            <div className="mb-2">
                              <strong>Адрес:</strong> {company.address}
                            </div>
                            <div className="mb-2">
                              <strong>Контактный email:</strong> {company.contactEmail}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="mb-3">
                              <Form.Label><strong>Название:</strong></Form.Label>
                              <Form.Control
                                type="text"
                                value={editForm.name || ''}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                placeholder="Введите название компании"
                                className="control-input"
                              />
                            </div>
                            <div className="mb-3">
                              <Form.Label><strong>Тип:</strong></Form.Label>
                              <Form.Control
                                type="text"
                                value={company.type === 'BUYER' ? 'Покупатель' : 'Продавец'}
                                disabled
                                className="bg-light text-muted"
                              />
                              <Form.Text className="text-muted">
                                Тип компании нельзя изменить
                              </Form.Text>
                            </div>
                            <div className="mb-3">
                              <Form.Label><strong>Адрес:</strong></Form.Label>
                              <Form.Control
                                type="text"
                                value={editForm.address || ''}
                                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                placeholder="Введите адрес компании"
                                className="control-input"
                              />
                            </div>
                            <div className="mb-3">
                              <Form.Label><strong>Контактный email:</strong></Form.Label>
                              <Form.Control
                                type="email"
                                value={editForm.contact_email || ''}
                                onChange={(e) => setEditForm({...editForm, contact_email: e.target.value})}
                                placeholder="Введите контактный email"
                                className="control-input"
                              />
                            </div>
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card>
                      <Card.Body>
                        {!isEditing ? (
                          <>
                            <h5 className="card-title">Статистика</h5>
                            <div className="mb-2">
                              <strong>Статус:</strong> 
                              <Badge bg={company.availability ? 'success' : 'danger'} className="ms-2">
                                {company.availability ? 'Активна' : 'Неактивна'}
                              </Badge>
                            </div>
                            <div className="mb-2">
                              <strong>Количество сотрудников:</strong> {company.users?.length || 0}
                            </div>
                          </>
                        ) : (
                          <>
                            <h5 className="card-title">Логотип компании</h5>
                            <div className="text-center mb-3">
                              {logoPreview ? (
                                <div className="position-relative d-inline-block">
                                  <img 
                                    src={logoPreview} 
                                    alt="Предварительный просмотр логотипа"
                                    style={{
                                      width: '120px',
                                      height: '120px',
                                      objectFit: 'cover',
                                      borderRadius: '12px',
                                      border: '2px solid #e9ecef',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                  />
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="position-absolute top-0 end-0"
                                    style={{ transform: 'translate(25%, -25%)' }}
                                    onClick={removeLogo}
                                  >
                                    <i className="bi bi-x" />
                                  </Button>
                                </div>
                              ) : (
                                <div 
                                  style={{
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '12px',
                                    border: '2px dashed #dee2e6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto',
                                    backgroundColor: '#f8f9fa'
                                  }}
                                >
                                  <i className="bi bi-image" style={{ fontSize: '2rem', color: '#6c757d' }} />
                                </div>
                              )}
                            </div>
                            
                            <div className="d-grid gap-2">
                              <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                disabled={updating || uploadingLogo}
                                style={{ display: 'none' }}
                                id="logo-upload"
                              />
                              <Button 
                                className="btn-brand d-flex align-items-center justify-content-center gap-2"
                                onClick={() => document.getElementById('logo-upload')?.click()}
                                disabled={updating || uploadingLogo}
                              >
                                {uploadingLogo ? (
                                  <>
                                    <Spinner animation="border" size="sm" />
                                    Загрузка...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-cloud-upload" />
                                    {logoPreview ? 'Изменить логотип' : 'Загрузить логотип'}
                                  </>
                                )}
                              </Button>
                              {logoPreview && (
                                <Button 
                                  variant="outline-danger"
                                  onClick={removeLogo}
                                  disabled={updating || uploadingLogo}
                                  className="d-flex align-items-center justify-content-center gap-2"
                                >
                                  <i className="bi bi-trash" />
                                  Удалить логотип
                                </Button>
                              )}
                            </div>
                            
                            <Form.Text className="text-muted mt-2 d-block text-center">
                              Поддерживаются форматы: JPEG, PNG, GIF, WebP<br/>
                              Максимальный размер: 5MB
                            </Form.Text>
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>
            </Tab>
            
            {isDirector && (
              <Tab eventKey="users" title="Сотрудники">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0">Список сотрудников</h5>
                  <Button className="btn btn-light" onClick={() => setShowCreate(true)}>
                    + Зарегистрировать оператора
                  </Button>
                </div>

                <div className="d-flex align-items-center mb-3 gap-3">
                  <div className="searchbar d-flex position-relative">
                    <Form.Control 
                      type="text" 
                      placeholder="Поиск сотрудников..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="control-input"
                      style={{ width: '200px', paddingRight: searchQuery ? '35px' : '12px' }}
                    />
                    {searchQuery && (
                      <Button 
                        variant="link" 
                        className="p-0 position-absolute" 
                        style={{ right: '50px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                        onClick={() => setSearchQuery('')}
                        aria-label="Очистить поиск"
                      >
                        <i className="bi bi-x" style={{ color: '#6c757d', fontSize: '18px' }} />
                      </Button>
                    )}
                    <Button className="btn-brand" type="button">
                      <i className="bi bi-search" />
                    </Button>
                  </div>
                  <Form.Check
                    type="switch"
                    id="users-availability-switch"
                    label={onlyAvailable ? 'Только доступные' : 'Только недоступные'}
                    checked={onlyAvailable}
                    onChange={(e) => { setOnlyAvailable(e.target.checked); setPage(0); }}
                  />
                </div>

                <div className="table-outline">
                  <Table className="align-middle table-custom table-bordered">
                    <thead className="bg-brand-tablehead text-white">
                      <tr>
                        <th className="text-center" style={{ width: '60px' }}></th>
                        <th className="text-start">ФИО</th>
                        <th className="text-center">Роль</th>
                        <th className="text-end">Почта</th>
                        <th className="text-center">Доступность</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!usersLoading && (!usersPage || (usersPage.content?.length ?? 0) === 0)) && (
                        <tr>
                          <td colSpan={5} className="text-center text-muted py-4">ничего не найдено</td>
                        </tr>
                      )}
                      {usersPage?.content.map((u) => {
                        const avatar = generateUserAvatar(u);
                        return (
                          <tr key={u.id}>
                            <td className="text-center">
                              <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>{u.name} {u.surname}</Tooltip>}
                              >
                                <div 
                                  className="rounded-circle d-inline-flex align-items-center justify-content-center" 
                                  style={{ 
                                    width: '36px', 
                                    height: '36px', 
                                    backgroundColor: avatar.backgroundColor,
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    transition: 'transform 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                >
                                  {avatar.initials}
                                </div>
                              </OverlayTrigger>
                            </td>
                            <td className="text-start">
                              <div>
                                <Link 
                                  to={`/user/${u.id}`} 
                                  className="fw-semibold text-decoration-none" 
                                  style={{ color: '#2f7fc4' }}
                                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                >
                                  {u.name} {u.surname}
                                </Link>
                                {u.birthDate && (
                                  <div>
                                    <small className="text-muted">
                                      {new Date(u.birthDate).toLocaleDateString('ru-RU')}
                                    </small>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="text-center">
                              {(() => {
                                const r = (u.role || '').toUpperCase();
                                const label = r === 'ADMIN' ? 'Админ' : r === 'DIRECTOR' ? 'Директор' : r === 'OPERATOR' ? 'Оператор' : u.role;
                                const cls = r === 'ADMIN' ? 'badge-pastel-admin' : r === 'DIRECTOR' ? 'badge-pastel-director' : 'badge-pastel-operator';
                                return <span className={`badge ${cls}`}>{label}</span>;
                              })()}
                            </td>
                            <td className="text-end">
                              <div className="text-end">
                                <div>{u.email}</div>
                              </div>
                            </td>
                            <td className="text-center">
                              <Form.Check 
                                type="switch" 
                                checked={!!u.availability} 
                                onChange={() => toggleUserAvailability(u)}
                                disabled={u.role === 'DIRECTOR'} 
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>

                <div className="d-flex justify-content-end align-items-center gap-3 mt-4 mb-0">
                  <div className="d-flex align-items-center gap-2 me-3">
                    <span className="text-muted small">На странице:</span>
                    <Dropdown onSelect={(key)=>{ const v = parseInt(key || '10', 10); setSize(v); setPage(0); }}>
                      <Dropdown.Toggle id="users-page-size" className="select-pill select-pill-sm">
                        {size} <span className="text-muted ms-1">шт.</span>
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="select-menu">
                        <Dropdown.Item eventKey="5" active={size===5}>
                          5 {size===5 && <i className="bi bi-check2 ms-2" />}
                        </Dropdown.Item>
                        <Dropdown.Item eventKey="10" active={size===10}>
                          10 {size===10 && <i className="bi bi-check2 ms-2" />}
                        </Dropdown.Item>
                        <Dropdown.Item eventKey="20" active={size===20}>
                          20 {size===20 && <i className="bi bi-check2 ms-2" />}
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                  <Button size="sm" variant="link" className="p-0" disabled={!usersPage || usersPage.number <= 0} onClick={() => setPage(p => Math.max(0, p-1))}>
                    <i className="bi bi-chevron-left" style={{ fontSize: 20, color: usersPage && usersPage.number > 0 ? '#2f7fc4' : '#b0b0b0' }} />
                  </Button>
                  <span className="text-muted small">{usersPage ? usersPage.number + 1 : 0} из {usersPage ? Math.max(1, usersPage.totalPages) : 0}</span>
                  <Button size="sm" variant="link" className="p-0" disabled={!usersPage || (usersPage.number + 1 >= usersPage.totalPages)} onClick={() => setPage(p => p+1)}>
                    <i className="bi bi-chevron-right" style={{ fontSize: 20, color: usersPage && (usersPage.number + 1 < usersPage.totalPages) ? '#2f7fc4' : '#b0b0b0' }} />
                  </Button>
                </div>
              </Tab>
            )}
          </Tabs>
        </div>
      </div>

      {/* Create User Modal */}
      <Offcanvas show={showCreate} onHide={() => setShowCreate(false)} placement="end" className="offcanvas-wide offcanvas-user">
        <Offcanvas.Header closeButton className="pb-2 mb-3">
          <Offcanvas.Title>Зарегистрировать оператора</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-4">
          <div className="my-auto">
            <div className="form-backdrop">
              <Form className="mb-3">
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Имя</Form.Label>
                      <Form.Control value={createForm.user.name} onChange={(e)=>setCreateForm({...createForm, user: {...createForm.user, name: e.target.value}})} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Фамилия</Form.Label>
                      <Form.Control value={createForm.user.surname} onChange={(e)=>setCreateForm({...createForm, user: {...createForm.user, surname: e.target.value}})} />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Дата рождения</Form.Label>
                      <Form.Control type="date" value={createForm.user.birthDate} onChange={(e)=>setCreateForm({...createForm, user: {...createForm.user, birthDate: e.target.value}})} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Email</Form.Label>
                      <Form.Control type="email" value={createForm.user.email} onChange={(e)=>{
                        const email = e.target.value;
                        setCreateForm({
                          ...createForm, 
                          user: {...createForm.user, email}, 
                          registerData: {...createForm.registerData, email}
                        });
                      }} />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Пароль</Form.Label>
                      <Form.Control 
                        type="password" 
                        value={createForm.registerData.password} 
                        onChange={(e)=>setCreateForm({...createForm, registerData: {...createForm.registerData, password: e.target.value}})} 
                        placeholder="Введите пароль" 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Повторите пароль</Form.Label>
                      <Form.Control 
                        type="password" 
                        value={createForm.registerData.repeatPassword} 
                        onChange={(e)=>setCreateForm({...createForm, registerData: {...createForm.registerData, repeatPassword: e.target.value}})} 
                        placeholder="Повторите пароль" 
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Alert variant="info" className="mt-2">
                  <small>Новый пользователь будет зарегистрирован с ролью <strong>Оператор</strong></small>
                </Alert>
              </Form>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="light" onClick={()=>setShowCreate(false)}>Отменить</Button>
                <Button className="btn-brand" onClick={doCreate}>Зарегистрировать</Button>
              </div>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}