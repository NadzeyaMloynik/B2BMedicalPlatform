import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table, Offcanvas, OverlayTrigger, Tooltip, Dropdown } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { optimizeImageUrl } from '@/lib/imageUpload';

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

export default function CompanyDetails() {
  const { id } = useParams();
  const companyId = Number(id);
  const { isAdmin, isDirector } = useAuth();

  const [company, setCompany] = useState<CompanyDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Users page state
  const [usersPage, setUsersPage] = useState<Page<UserDto> | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<RegisterUserRequestDto>(defaultCreate(companyId));

  // Edit user drawer state
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [editUserForm, setEditUserForm] = useState<{ name?: string; surname?: string; birthDate?: string; email?: string }>({});
  const [makeDirectorFlag, setMakeDirectorFlag] = useState<boolean>(false);

  useEffect(() => {
    setCreateForm(defaultCreate(companyId));
  }, [companyId]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<CompanyDto>(`/user-service/companies/${companyId}`);
      setCompany(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load company');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const params: any = { page, size, companyId };
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

  useEffect(() => { load(); /* eslint-disable-line */ }, [companyId]);
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(0); // Reset to first page when search changes
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  useEffect(() => { loadUsers(); /* eslint-disable-line */ }, [companyId, page, size, onlyAvailable, debouncedSearchQuery]);

  const doCreate = async () => {
    try {
      // Register user through user service
      await api.post('/user-service/users/register', createForm, { headers: { 'Content-Type': 'application/json' } });
      
      setShowCreate(false);
      setCreateForm(defaultCreate(companyId));
      
      // Reload users list to show the new registered user
      loadUsers();
    } catch (e: any) {
      // error toast will show; also keep drawer open
    }
  };

  const makeDirector = async (u: UserDto) => {
    try {
      await api.patch(`/user-service/users/to-director/${u.id}`);
      loadUsers();
    } catch (e: any) {
      // toast will display
    }
  };

  const openEditUser = (u: UserDto) => {
    setEditingUser(u);
    setEditUserForm({
      name: u.name || '',
      surname: u.surname || '',
      birthDate: (u.birthDate || '').slice(0, 10),
      email: u.email || ''
    });
    setMakeDirectorFlag((u.role || '').toUpperCase() === 'DIRECTOR');
  };

  const doUpdateUser = async () => {
    if (!editingUser) return;
    try {
      await api.put(`/user-service/users/${editingUser.id}`, editUserForm, { headers: { 'Content-Type': 'application/json' } });
      const wasDirector = (editingUser.role || '').toUpperCase() === 'DIRECTOR';
      if (makeDirectorFlag && !wasDirector) {
        await api.patch(`/user-service/users/to-director/${editingUser.id}`);
      }
      setEditingUser(null);
      setEditUserForm({});
      setMakeDirectorFlag(false);
      loadUsers();
    } catch (e: any) {
      // toast will display
    }
  };

  const toggleUserAvailability = async (u: UserDto) => {
    const newAvail = !u.availability;
    try {
      await api.patch(`/user-service/users/${u.id}`, null, { params: { availability: newAvail } });
      // Optimistic update: remove or update the user in the current page
      setUsersPage((prev) => {
        if (!prev) return prev;
        const content = prev.content.slice();
        const idx = content.findIndex((it) => it.id === u.id);
        if (idx >= 0) {
          if (onlyAvailable !== newAvail) {
            // No longer matches filter -> remove from current page
            content.splice(idx, 1);
          } else {
            content[idx] = { ...content[idx], availability: newAvail } as UserDto;
          }
        }
        const next = { ...prev, content } as Page<UserDto>;
        return next;
      });
      // If page became empty and there are previous pages — step back
      setTimeout(() => {
        setUsersPage((prev) => {
          if (!prev) return prev;
          if (prev.content.length === 0 && page > 0) {
            setPage((p) => Math.max(0, p - 1));
          } else {
            // Ensure server state is in sync
            loadUsers();
          }
          return prev;
        });
      }, 0);
    } catch (e: any) {
      // toast will display
    }
  };

  return (
    <div className="page-container">
      <div className="container-fluid">
        <div className="d-flex align-items-center mb-4">
          <div className="ms-auto">
            <Link to="/admin/companies" className="link-blue">← Назад к компаниям</Link>
          </div>
        </div>

        {loading && <div className="text-center py-4"><Spinner /></div>} 
        {error && <Alert variant="danger" className="content-card">{error}</Alert>}

        {company && (
          <>
            <div className="page-header">
              <div className="d-flex align-items-center justify-content-between">
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
                    <h1 className="page-title d-flex align-items-center gap-2">{company.name} {(() => { const t = (company.type || '').toUpperCase(); const label = t === 'ADMIN' ? 'Админ' : t === 'BUYER' ? 'Покупатель' : t === 'SELLER' ? 'Продавец' : (company.type || ''); const cls = t === 'ADMIN' ? 'badge-pastel-admin' : t === 'BUYER' ? 'badge-pastel-buyer' : t === 'SELLER' ? 'badge-pastel-seller' : 'text-bg-secondary'; return <span className={`badge ${cls}`}>{label}</span>; })()}</h1>
                    <div className="mb-2 opacity-90">{company.address}</div>
                    <div className="opacity-90">{company.contactEmail}</div>
                  </div>
                </div>
                {(isDirector || isAdmin) && (
                  <Button className="btn btn-light" onClick={() => setShowCreate(true)}>+ Зарегистрировать пользователя</Button>
                )}
              </div>
            </div>

            <div className="content-card">

              <div className="d-flex align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <h4 className="mb-0 me-2">Сотрудники</h4>
                </div>
                <div className="ms-auto d-flex align-items-center gap-3">
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
                  <th className="text-center">Действия</th>
                </tr>
              </thead>
              <tbody>
                {(!usersLoading && (!usersPage || (usersPage.content?.length ?? 0) === 0)) && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">ничего не найдено</td>
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
                        })()
                        }
                      </td>
                      <td className="text-end">
                        <div className="text-end">
                          <div>{u.email}</div>
                        </div>
                      </td>
                      <td className="text-center">
                        <Form.Check type="switch" checked={!!u.availability} onChange={() => toggleUserAvailability(u)} />
                      </td>
                      <td className="text-center">
                        <Button size="sm" variant="link" className="p-0" aria-label="Редактировать" onClick={() => openEditUser(u)}>
                          <i className="bi bi-pencil-square" style={{ color: '#2f7fc4', fontSize: 18 }} />
                        </Button>
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
                  <Dropdown.Item eventKey="50" active={size===50}>
                    50 {size===50 && <i className="bi bi-check2 ms-2" />}
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
            <Button size="sm" variant="link" className="p-0" disabled={usersPage ? usersPage.number <= 0 : true} onClick={() => setPage((p)=> Math.max(0, p-1))}>
              <i className="bi bi-chevron-left" style={{ fontSize: 20, color: usersPage && usersPage.number > 0 ? '#2f7fc4' : '#b0b0b0' }} />
            </Button>
            <span className="text-muted small">{usersPage ? usersPage.number + 1 : 0} из {usersPage ? Math.max(1, usersPage.totalPages) : 0}</span>
            <Button size="sm" variant="link" className="p-0" disabled={usersPage ? (usersPage.number + 1 >= usersPage.totalPages) : true} onClick={() => setPage((p)=> p+1)}>
              <i className="bi bi-chevron-right" style={{ fontSize: 20, color: usersPage && (usersPage.number + 1 < usersPage.totalPages) ? '#2f7fc4' : '#b0b0b0' }} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

       <>
      <Offcanvas show={!!editingUser} onHide={() => setEditingUser(null)} placement="end" className="offcanvas-wide offcanvas-user">
        <Offcanvas.Header closeButton className="pb-2 mb-3">
          <Offcanvas.Title>Редактировать пользователя</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-4">
          <div className="my-auto">
            <div className="form-backdrop">
              <Form className="mb-3">
                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Имя</Form.Label>
                        <Form.Control value={editUserForm.name || ''} onChange={(e)=>setEditUserForm({ ...editUserForm, name: e.target.value })} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Фамилия</Form.Label>
                        <Form.Control value={editUserForm.surname || ''} onChange={(e)=>setEditUserForm({ ...editUserForm, surname: e.target.value })} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Дата рождения</Form.Label>
                        <Form.Control className="form-control form-control-sm" type="date" value={editUserForm.birthDate || ''} onChange={(e)=>setEditUserForm({ ...editUserForm, birthDate: e.target.value })} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Почта</Form.Label>
                        <Form.Control className="form-control form-control-sm" type="email" value={editUserForm.email || ''} onChange={(e)=>setEditUserForm({ ...editUserForm, email: e.target.value })} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mt-2">
                    <Form.Check
                      type="switch"
                      id="make-director-switch"
                      label="Сделать директором"
                      checked={makeDirectorFlag}
                      disabled={(editingUser?.role || '').toUpperCase() === 'DIRECTOR'}
                      onChange={(e)=> setMakeDirectorFlag(e.target.checked)}
                    />
                  </Form.Group>
              </Form>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="light" onClick={()=>setEditingUser(null)}>Отменить</Button>
                <Button className="btn-brand" onClick={doUpdateUser}>Сохранить</Button>
              </div>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <Offcanvas show={showCreate} onHide={() => setShowCreate(false)} placement="end" className="offcanvas-wide offcanvas-user">
        <Offcanvas.Header closeButton className="pb-2 mb-3">
          <Offcanvas.Title>Зарегистрировать пользователя</Offcanvas.Title>
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
                        placeholder="Минимум 8 символов, одна заглавная и цифра" 
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
                <Form.Group className="mt-2 d-flex align-items-center gap-2">
                  <Form.Label className="mb-0">Роль</Form.Label>
                  <Dropdown onSelect={(key)=>{ 
                    const role = key || 'OPERATOR';
                    setCreateForm({ 
                      ...createForm, 
                      user: {...createForm.user, role},
                      registerData: {...createForm.registerData, roles: [role]}
                    }); 
                  }}>
                    <Dropdown.Toggle id="create-user-role" className="select-pill select-pill-sm">
                      {createForm.user.role === 'DIRECTOR' ? 'Директор' : 'Оператор'}
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="select-menu">
                      <Dropdown.Item eventKey="DIRECTOR" active={createForm.user.role === 'DIRECTOR'}>
                        Директор {createForm.user.role === 'DIRECTOR' && <i className="bi bi-check2 ms-2" />}
                      </Dropdown.Item>
                      <Dropdown.Item eventKey="OPERATOR" active={createForm.user.role === 'OPERATOR'}>
                        Оператор {createForm.user.role === 'OPERATOR' && <i className="bi bi-check2 ms-2" />}
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </Form.Group>
              </Form>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="light" onClick={()=>setShowCreate(false)}>Отменить</Button>
                <Button className="btn-brand" onClick={doCreate}>Зарегистрировать</Button>
              </div>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
    </div>
  );
}
