import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Row, Spinner, Table, InputGroup, Dropdown, Offcanvas } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { validateImageFile, generateLogoFileName, uploadToCloudinary, optimizeImageUrl, fileToBase64 } from '@/lib/imageUpload';

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
}

interface CompanyCreateDto {
  name: string;
  type: string;
  address: string;
  contactEmail: string;
  logoUrl?: string;
}

interface CompanyUpdateDto {
  name?: string;
  type?: string;
  address?: string;
  contact_email?: string;
  logo_url?: string;
}

const defaultCreate: CompanyCreateDto = {
  name: '',
  type: '',
  address: '',
  contactEmail: '',
  logoUrl: ''
};

export default function AdminCompanies() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [data, setData] = useState<Page<CompanyDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [searchName, setSearchName] = useState<string>('');
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [companyType, setCompanyType] = useState<string>('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CompanyCreateDto>(defaultCreate);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);

  const [editing, setEditing] = useState<CompanyDto | null>(null);
  const [editForm, setEditForm] = useState<CompanyUpdateDto>({});
  const [editLogoPreview, setEditLogoPreview] = useState<string>('');
  const [editLogoUploading, setEditLogoUploading] = useState(false);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);

  const canPrev = useMemo(() => (data ? data.number > 0 : false), [data]);
  const canNext = useMemo(() => (data ? data.number + 1 < data.totalPages : false), [data]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page, size, availability: onlyAvailable };
      if (searchName.trim()) params.name = searchName.trim();
      if (companyType) params.type = companyType; // expected values: ADMIN, CUSTOMER, SELLER
      const res = await api.get<Page<CompanyDto>>('/user-service/companies', { params });
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, onlyAvailable, searchName, companyType]);

  const toggleAvailability = async (c: CompanyDto) => {
    try {
      await api.patch(`/user-service/companies/${c.id}`, null, { params: { availability: !c.availability } });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to change availability');
    }
  };

  const doCreate = async () => {
    try {
      await api.post('/user-service/companies', createForm, { headers: { 'Content-Type': 'application/json' } });
      setShowCreate(false);
      setCreateForm(defaultCreate);
      setLogoPreview('');
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create company');
    }
  };

  const onLogoFile = async (file?: File) => {
    if (!file) return;
    
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Неверный файл');
      return;
    }
    
    setLogoUploading(true);
    try {
      const fileName = generateLogoFileName(createForm.name || 'company', file.name);
      const logoUrl = await uploadToCloudinary(file, fileName);
      const optimizedUrl = optimizeImageUrl(logoUrl);
      
      setCreateForm({ ...createForm, logoUrl: optimizedUrl });
      setLogoPreview(optimizedUrl);
      setError(''); // Clear any previous errors
    } catch (error: any) {
      setError(error.message || 'Ошибка при загрузке логотипа');
    } finally {
      setLogoUploading(false);
    }
  };

  const doUpdate = async () => {
    if (!editing) return;
    
    setEditLogoUploading(true);
    try {
      let finalEditForm = { ...editForm };
      
      // Upload logo if a new file was selected
      if (editSelectedFile) {
        const fileName = generateLogoFileName(editing.name, editSelectedFile.name);
        const logoUrl = await uploadToCloudinary(editSelectedFile, fileName);
        const optimizedUrl = optimizeImageUrl(logoUrl);
        finalEditForm.logo_url = optimizedUrl;
      }
      
      await api.put(`/user-service/companies/${editing.id}`, finalEditForm, { headers: { 'Content-Type': 'application/json' } });
      
      setEditing(null);
      setEditForm({});
      setEditLogoPreview('');
      setEditSelectedFile(null);
      
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update company');
    } finally {
      setEditLogoUploading(false);
    }
  };

  const onEditLogoFile = async (file?: File) => {
    if (!file || !editing) return;
    
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Неверный файл');
      return;
    }
    
    try {
      // Only create preview, don't upload yet
      const previewUrl = await fileToBase64(file);
      setEditSelectedFile(file);
      setEditLogoPreview(previewUrl);
      setError(''); // Clear any previous errors
    } catch (error: any) {
      setError('Ошибка при создании превью изображения');
    }
  };

  return (
    <>
      <div className="page-container">
        <div className="container-fluid">
          <div className="page-header">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h1 className="page-title">Компании</h1>
                <div className="opacity-90">Управление компаниями в системе</div>
              </div>
              <Button className="btn btn-light" onClick={() => setShowCreate(true)}>+ Создать компанию</Button>
            </div>
          </div>

        <div className="content-card">
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          {loading && <div className="text-center py-4"><Spinner /></div>}

          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-3">
              <h4 className="mb-0">Список компаний</h4>
              <Button variant="link" className="p-0 d-inline-flex align-items-center filter-link" onClick={()=>setFilterOpen(v=>!v)}>
                <span className="me-1">Фильтры</span>
                <i className={`bi ${filterOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
              </Button>
            </div>
            <div className="d-flex align-items-center gap-3">
              <Form className="d-flex" onSubmit={(e)=>{ e.preventDefault(); setPage(0); }}>
                <div className="searchbar d-flex position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Поиск компаний..."
                    value={searchName}
                    onChange={(e)=>setSearchName(e.target.value)}
                    className="control-input"
                    style={{ width: '240px', paddingRight: searchName ? '35px' : '12px' }}
                  />
                  {searchName && (
                    <Button 
                      variant="link" 
                      className="p-0 position-absolute" 
                      style={{ right: '50px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                      onClick={() => { setSearchName(''); setPage(0); }}
                      aria-label="Очистить поиск"
                    >
                      <i className="bi bi-x" style={{ color: '#6c757d', fontSize: '18px' }} />
                    </Button>
                  )}
                  <Button type="submit" className="btn-brand">
                    <i className="bi bi-search" />
                  </Button>
                </div>
              </Form>
              <Form.Check
                type="switch"
                id="availability-switch-top"
                label={onlyAvailable ? 'Только доступные' : 'Только недоступные'}
                checked={onlyAvailable}
                onChange={(e) => { setOnlyAvailable(e.target.checked); setPage(0); }}
              />
            </div>
          </div>

          {filterOpen && (
            <div className="mb-3 p-3 bg-light rounded">
              <div className="d-flex align-items-center gap-2">
                <Form.Label className="mb-0 fw-bold">Тип компании:</Form.Label>
                <Dropdown onSelect={(key)=>{ setCompanyType(key || ''); setPage(0); }}>
                  <Dropdown.Toggle id="company-type" className="select-pill select-pill-sm">
                    {companyType === '' ? 'Все типы' : companyType === 'ADMIN' ? 'Админ' : companyType === 'BUYER' ? 'Покупатель' : 'Продавец'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="select-menu">
                    <Dropdown.Item eventKey="" active={companyType === ''}>
                      Все типы {companyType === '' && <i className="bi bi-check2 ms-2" />}
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="ADMIN" active={companyType === 'ADMIN'}>
                      Админ {companyType === 'ADMIN' && <i className="bi bi-check2 ms-2" />}
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="BUYER" active={companyType === 'BUYER'}>
                      Покупатель {companyType === 'BUYER' && <i className="bi bi-check2 ms-2" />}
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="SELLER" active={companyType === 'SELLER'}>
                      Продавец {companyType === 'SELLER' && <i className="bi bi-check2 ms-2" />}
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
          )}

          <div className="table-outline">
            <Table className="align-middle table-custom table-bordered">
              <thead className="bg-brand-tablehead text-white">
                <tr>
                  <th className="text-center" style={{ width: '60px' }}>Лого</th>
                  <th className="text-start">Название</th>
                  <th className="text-center">Тип</th>
                  <th className="text-end">Контакт</th>
                  <th className="text-center">Доступность</th>
                  <th className="text-center"></th>
                </tr>
              </thead>
              <tbody>
                {(!loading && (!data || (data.content?.length ?? 0) === 0)) && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">ничего не найдено</td>
                  </tr>
                )}
                {data?.content.map(c => {
                  const typeLabel = c.type?.toUpperCase() === 'ADMIN' ? 'Админ' : c.type?.toUpperCase() === 'BUYER' ? 'Покупатель' : c.type?.toUpperCase() === 'SELLER' ? 'Продавец' : c.type;
                  const badgeClass = c.type?.toUpperCase() === 'ADMIN' ? 'badge-pastel-admin' : c.type?.toUpperCase() === 'BUYER' ? 'badge-pastel-buyer' : 'badge-pastel-seller';
                  return (
                    <tr key={c.id}>
                      <td className="text-center">
                        {c.logoUrl ? (
                          <img 
                            src={optimizeImageUrl(c.logoUrl)} 
                            alt={`Лого ${c.name}`}
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              objectFit: 'cover', 
                              borderRadius: '8px',
                              border: '1px solid rgba(0,0,0,0.1)'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {!c.logoUrl && (
                          <div 
                            className="d-flex align-items-center justify-content-center rounded" 
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              backgroundColor: '#f8f9fa',
                              border: '1px solid rgba(0,0,0,0.1)',
                              color: '#6c757d'
                            }}
                          >
                            <i className="bi bi-building" style={{ fontSize: '16px' }} />
                          </div>
                        )}
                      </td>
                      <td><Link className="link-blue" to={`/companies/${c.id}`}>{c.name}</Link></td>
                      <td className="text-center"><span className={`badge ${badgeClass}`}>{typeLabel}</span></td>
                      <td className="text-end">{c.contactEmail}</td>
                      <td className="text-center">
                        <Form.Check type="switch" checked={!!c.availability} onChange={async () => { await toggleAvailability(c); }} />
                      </td>
                      <td className="text-center">
                        <Button variant="link" className="p-0" onClick={() => { setEditing(c); setEditForm({ name: c.name, type: c.type, address: c.address, contact_email: c.contactEmail, logo_url: c.logoUrl || '' }); setEditLogoPreview(c.logoUrl || ''); setEditSelectedFile(null); }}>
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
                <Dropdown.Toggle id="page-size" className="select-pill select-pill-sm">
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
            <Button size="sm" variant="link" className="p-0" disabled={!canPrev} onClick={() => setPage(p => Math.max(0, p-1))}>
              <i className="bi bi-chevron-left" style={{ fontSize: 20, color: canPrev ? '#2f7fc4' : '#b0b0b0' }} />
            </Button>
            <span className="text-muted small">{data ? data.number + 1 : 0} из {data ? Math.max(1, data.totalPages) : 0}</span>
            <Button size="sm" variant="link" className="p-0" disabled={!canNext} onClick={() => setPage(p => p+1)}>
              <i className="bi bi-chevron-right" style={{ fontSize: 20, color: canNext ? '#2f7fc4' : '#b0b0b0' }} />
            </Button>
          </div>
          </div>
        </div>
      </div>

      <Offcanvas show={showCreate} onHide={() => setShowCreate(false)} placement="end" className="offcanvas-wide offcanvas-user">
        <Offcanvas.Header closeButton className="pb-2 mb-3">
          <Offcanvas.Title>Создать компанию</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-4">
          <div className="my-auto">
            <div className="form-backdrop">
              <Form className="mb-3">
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Название</Form.Label>
                      <Form.Control value={createForm.name} onChange={(e)=>setCreateForm({...createForm,name:e.target.value})} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Адрес</Form.Label>
                      <Form.Control value={createForm.address} onChange={(e)=>setCreateForm({...createForm,address:e.target.value})} />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-2 d-flex align-items-center gap-2">
                      <Form.Label className="mb-0">Тип компании</Form.Label>
                      <Dropdown onSelect={(key)=>{ setCreateForm({ ...createForm, type: (key || '') as any }); }}>
                        <Dropdown.Toggle id="create-company-type" className="select-pill select-pill-sm">
                          {createForm.type === '' ? 'Выберите тип' : createForm.type === 'BUYER' ? 'Покупатель' : 'Продавец'}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="select-menu">
                          <Dropdown.Item eventKey="BUYER" active={createForm.type === 'BUYER'}>
                            Покупатель {createForm.type === 'BUYER' && <i className="bi bi-check2 ms-2" />}
                          </Dropdown.Item>
                          <Dropdown.Item eventKey="SELLER" active={createForm.type === 'SELLER'}>
                            Продавец {createForm.type === 'SELLER' && <i className="bi bi-check2 ms-2" />}
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Почта</Form.Label>
                      <Form.Control type="email" value={createForm.contactEmail} onChange={(e)=>setCreateForm({...createForm,contactEmail:e.target.value})} />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mt-2">
                  <Form.Label>Логотип</Form.Label>
                  <Form.Control 
                    type="file" 
                    accept="image/*" 
                    onChange={(e)=> onLogoFile((e.target as HTMLInputElement).files?.[0])}
                    disabled={logoUploading}
                  />
                  {logoUploading && (
                    <div className="mt-2 d-flex align-items-center gap-2">
                      <Spinner animation="border" size="sm" />
                      <span className="text-muted">Загрузка логотипа...</span>
                    </div>
                  )}
                  {logoPreview && !logoUploading && (
                    <div className="border rounded mt-2" style={{ overflow: 'hidden', width: '120px', height: '120px' }}>
                      <img src={logoPreview} alt="Превью логотипа" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </Form.Group>
              </Form>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="light" onClick={()=>setShowCreate(false)}>Отменить</Button>
                <Button className="btn-brand" onClick={doCreate}>Создать</Button>
              </div>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <Offcanvas show={!!editing} onHide={() => { setEditing(null); setEditSelectedFile(null); setEditLogoPreview(''); }} placement="end" className="offcanvas-wide offcanvas-user">
        <Offcanvas.Header closeButton className="pb-2 mb-3">
          <Offcanvas.Title>Редактировать компанию</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-4">
          <div className="my-auto">
            <div className="form-backdrop">
              <Form className="mb-3">
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Название</Form.Label>
                      <Form.Control value={editForm.name||''} onChange={(e)=>setEditForm({...editForm,name:e.target.value})} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Адрес</Form.Label>
                      <Form.Control value={editForm.address||''} onChange={(e)=>setEditForm({...editForm,address:e.target.value})} />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-2 d-flex align-items-center gap-2">
                      <Form.Label className="mb-0">Тип компании</Form.Label>
                      <Dropdown onSelect={(key)=>{ setEditForm({ ...editForm, type: (key || '') as any }); }}>
                        <Dropdown.Toggle id="edit-company-type" className="select-pill select-pill-sm">
                          {(!editForm.type || editForm.type === '') ? 'Выберите тип' : editForm.type === 'BUYER' ? 'Покупатель' : 'Продавец'}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="select-menu">
                          <Dropdown.Item eventKey="BUYER" active={editForm.type === 'BUYER'}>
                            Покупатель {editForm.type === 'BUYER' && <i className="bi bi-check2 ms-2" />}
                          </Dropdown.Item>
                          <Dropdown.Item eventKey="SELLER" active={editForm.type === 'SELLER'}>
                            Продавец {editForm.type === 'SELLER' && <i className="bi bi-check2 ms-2" />}
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Почта</Form.Label>
                      <Form.Control type="email" value={editForm.contact_email||''} onChange={(e)=>setEditForm({...editForm,contact_email:e.target.value})} />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mt-2">
                  <Form.Label>Логотип</Form.Label>
                  <Form.Control 
                    type="file" 
                    accept="image/*" 
                    onChange={(e)=> onEditLogoFile((e.target as HTMLInputElement).files?.[0])}
                    disabled={editLogoUploading}
                  />
                  {editLogoUploading && (
                    <div className="mt-2 d-flex align-items-center gap-2">
                      <Spinner animation="border" size="sm" />
                      <span className="text-muted">Загрузка логотипа...</span>
                    </div>
                  )}
                  {!editLogoUploading && (editLogoPreview || editForm.logo_url) && (
                    <div className="border rounded mt-2" style={{ overflow: 'hidden', width: '120px', height: '120px' }}>
                      <img src={editLogoPreview || (editForm.logo_url as any) || ''} alt="Превью логотипа" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </Form.Group>
              </Form>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="light" onClick={()=>{setEditing(null); setEditSelectedFile(null); setEditLogoPreview('');}}>Отменить</Button>
                <Button className="btn-brand" onClick={doUpdate}>Сохранить</Button>
              </div>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
