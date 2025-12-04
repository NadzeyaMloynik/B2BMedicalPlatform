import { useState, useEffect, useMemo } from 'react';
import { Button, Table, Modal, Form, Spinner, Alert, Row, Col, Card, Offcanvas, Dropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { productService } from '../lib/productService';
import { uploadToCloudinary, validateImageFile } from '../lib/imageUpload';
import { jwtDecode } from 'jwt-decode';
import api from '../lib/api';
import type { Product, Category, Page } from '../lib/types';
import Pagination from '../components/Pagination';

export default function MyProducts() {
  const { accessToken, isSellerCompany } = useAuth();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [data, setData] = useState<Page<Product> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchName, setSearchName] = useState('');
  const [onlyActive, setOnlyActive] = useState<boolean>(true);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    netPrice: '',
    sku: '',
    stock: '',
    categoryId: ''
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [editing, setEditing] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    netPrice: '',
    stock: ''
  });

  const canPrev = useMemo(() => (data ? data.pageable.pageNumber > 0 : false), [data]);
  const canNext = useMemo(() => (data ? data.pageable.pageNumber + 1 < data.totalPages : false), [data]);

  useEffect(() => {
    if (accessToken) {
      loadCompanyId();
      loadCategories();
    }
  }, [accessToken]);

  useEffect(() => {
    if (companyId) {
      load();
    }
  }, [page, size, companyId, searchName, onlyActive]);

  const loadCompanyId = async () => {
    try {
      const decoded: any = jwtDecode(accessToken!);
      const email = decoded.sub;
      const { data } = await api.get(`/user-service/companies/user/${email}`);
      setCompanyId(data.id);
    } catch (err) {
      setError('Не удалось загрузить информацию о компании');
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await productService.getAllCategories({ page: 0, size: 100, availability: true });
      setCategories(categoriesData.content);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params: any = { companyId, page, size };
      if (searchName.trim()) {
        params.name = searchName.trim();
      }
      if (onlyActive !== undefined) {
        params.availability = onlyActive;
      }
      const res = await productService.getProducts(params);
      setData(res);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка загрузки товаров');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + imageFiles.length > 5) {
      setError('Максимум 5 изображений');
      return;
    }

    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'Ошибка валидации файла');
        return;
      }
    }

    setImageFiles((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const doCreate = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      // Upload images
      const imageUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileName = `product_${createForm.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}_${i}`;
        const url = await uploadToCloudinary(file, fileName);
        imageUrls.push(url);
      }

      const productDto = {
        companyId,
        name: createForm.name,
        description: createForm.description,
        netPrice: parseFloat(createForm.netPrice),
        sku: createForm.sku || `SKU-${Date.now()}`,
        stock: parseInt(createForm.stock, 10),
        categoryId: parseInt(createForm.categoryId, 10),
        imageUrls
      };

      await productService.createProduct(productDto);
      setShowCreate(false);
      setCreateForm({
        name: '',
        description: '',
        netPrice: '',
        sku: '',
        stock: '',
        categoryId: ''
      });
      setImageFiles([]);
      setImagePreviews([]);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка создания товара');
    } finally {
      setLoading(false);
    }
  };

  const doUpdate = async () => {
    if (!editing) return;
    try {
      const updateDto = {
        name: editForm.name,
        description: editForm.description,
        netPrice: parseFloat(editForm.netPrice),
        stock: parseInt(editForm.stock, 10)
      };
      await productService.updateProduct(editing.id, updateDto);
      setEditing(null);
      setEditForm({ name: '', description: '', netPrice: '', stock: '' });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка обновления товара');
    }
  };

  const toggleStatus = async (product: Product) => {
    try {
      await productService.changeProductStatus(product.id, !product.isActive);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка изменения статуса');
    }
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setEditForm({
      name: product.name,
      description: product.description || '',
      netPrice: product.netPrice.toString(),
      stock: product.stock.toString()
    });
  };

  if (!isSellerCompany) {
    return (
      <div className="page-container">
        <div className="container-fluid">
          <Alert variant="warning">
            Эта страница доступна только для компаний-продавцов
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-container">
        <div className="container-fluid">
          <div className="page-header">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h1 className="page-title">Мои товары</h1>
                <div className="opacity-90">Управление товарами вашей компании</div>
              </div>
              <Button className="btn btn-light" onClick={() => setShowCreate(true)}>
                + Добавить товар
              </Button>
            </div>
          </div>

          <div className="content-card">
            {error && <Alert variant="danger" className="mb-3" dismissible onClose={() => setError('')}>{error}</Alert>}
            {loading && <div className="text-center py-4"><Spinner /></div>}

            <div className="d-flex align-items-center justify-content-between mb-3">
              <h4 className="mb-0">Список товаров</h4>
              <div className="d-flex align-items-center gap-3">
                <Form.Check
                  type="switch"
                  id="products-active-switch"
                  label={onlyActive ? 'Только активные' : 'Только неактивные'}
                  checked={onlyActive}
                  onChange={(e) => { setOnlyActive(e.target.checked); setPage(0); }}
                />
              <Form className="d-flex" onSubmit={(e) => { e.preventDefault(); setPage(0); }}>
                <div className="searchbar d-flex position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Поиск товаров..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="control-input"
                    style={{ width: '240px', paddingRight: searchName ? '35px' : '12px' }}
                  />
                  {searchName && (
                    <Button
                      variant="link"
                      className="p-0 position-absolute"
                      style={{ right: '50px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                      onClick={() => { setSearchName(''); setPage(0); }}
                    >
                      <i className="bi bi-x" style={{ color: '#6c757d', fontSize: '18px' }} />
                    </Button>
                  )}
                  <Button type="submit" className="btn-brand">
                    <i className="bi bi-search" />
                  </Button>
                </div>
              </Form>
              </div>
            </div>

            <div className="table-outline">
              <Table className="align-middle table-custom table-bordered">
                <thead className="bg-brand-tablehead text-white">
                  <tr>
                    <th className="text-center" style={{ width: '60px' }}>Фото</th>
                    <th className="text-start">Название</th>
                    <th className="text-center">Категория</th>
                    <th className="text-end">Цена</th>
                    <th className="text-center">Склад</th>
                    <th className="text-center">Статус</th>
                    <th className="text-center" style={{ width: '150px' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {(!loading && (!data || (data.content?.length ?? 0) === 0)) && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">Товары не найдены</td>
                    </tr>
                  )}
                  {data?.content.map(product => (
                    <tr key={product.id}>
                      <td className="text-center">
                        {product.images.length > 0 ? (
                          <img 
                            src={product.images[0].url} 
                            alt={product.name}
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', backgroundColor: '#e9ecef', borderRadius: '4px' }} />
                        )}
                      </td>
                      <td>{product.name}</td>
                      <td className="text-center">
                        <span className="badge bg-secondary">{product.category.name}</span>
                      </td>
                      <td className="text-end">{product.price.toFixed(2)} ₽</td>
                      <td className="text-center">{product.stock} шт.</td>
                      <td className="text-center">
                        {product.isActive ? (
                          <span className="badge bg-success">Активен</span>
                        ) : (
                          <span className="badge bg-secondary">Неактивен</span>
                        )}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1 me-2"
                          onClick={() => openEdit(product)}
                          title="Редактировать"
                        >
                          <i className="bi bi-pencil" />
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1"
                          onClick={() => toggleStatus(product)}
                          title={product.isActive ? 'Деактивировать' : 'Активировать'}
                        >
                          <i className={`bi ${product.isActive ? 'bi-eye-slash' : 'bi-eye'}`} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {data && (
              <Pagination
                currentPage={data.pageable.pageNumber}
                totalPages={data.totalPages}
                pageSize={size}
                totalElements={data.totalElements}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setSize(newSize);
                  setPage(0);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Create Offcanvas */}
      <Offcanvas show={showCreate} onHide={() => setShowCreate(false)} placement="end" className="offcanvas-wide offcanvas-user">
        <Offcanvas.Header closeButton className="pb-2 mb-3">
          <Offcanvas.Title>Добавить товар</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-4">
          <div className="my-auto">
            <div className="form-backdrop">
              <Form className="mb-3">
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Название *</Form.Label>
                      <Form.Control
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2 d-flex align-items-center gap-2">
                      <Form.Label className="mb-0">Категория *</Form.Label>
                      <Dropdown onSelect={(key) => { setCreateForm({ ...createForm, categoryId: key || '' }); }}>
                        <Dropdown.Toggle id="create-category" className="select-pill select-pill-sm">
                          {createForm.categoryId ? categories.find(c => c.id.toString() === createForm.categoryId)?.name || 'Выберите категорию' : 'Выберите категорию'}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="select-menu">
                          {categories.map((cat) => (
                            <Dropdown.Item key={cat.id} eventKey={cat.id.toString()} active={createForm.categoryId === cat.id.toString()}>
                              {cat.name} {createForm.categoryId === cat.id.toString() && <i className="bi bi-check2 ms-2" />}
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-2">
                  <Form.Label>Описание *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    required
                  />
                </Form.Group>

                <Row className="g-2">
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Цена без наценки (₽) *</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        value={createForm.netPrice}
                        onChange={(e) => setCreateForm({ ...createForm, netPrice: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Количество *</Form.Label>
                      <Form.Control
                        type="number"
                        value={createForm.stock}
                        onChange={(e) => setCreateForm({ ...createForm, stock: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Артикул (SKU)</Form.Label>
                      <Form.Control
                        type="text"
                        value={createForm.sku}
                        onChange={(e) => setCreateForm({ ...createForm, sku: e.target.value })}
                        placeholder="Автогенерация"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mt-2">
                  <Form.Label>Изображения (до 5)</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    disabled={imageFiles.length >= 5}
                  />
                </Form.Group>

                {imagePreviews.length > 0 && (
                  <Row className="g-2 mt-2">
                    {imagePreviews.map((preview, idx) => (
                      <Col xs={4} key={idx}>
                        <div className="position-relative">
                          <img 
                            src={preview} 
                            alt={`Превью ${idx + 1}`} 
                            className="w-100 rounded" 
                            style={{ height: '100px', objectFit: 'cover' }}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            className="position-absolute top-0 end-0 m-1"
                            onClick={() => handleRemoveImage(idx)}
                            style={{ padding: '2px 6px', fontSize: '12px' }}
                          >
                            <i className="bi bi-x" />
                          </Button>
                        </div>
                      </Col>
                    ))}
                  </Row>
                )}
              </Form>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="light" onClick={() => setShowCreate(false)}>Отменить</Button>
                <Button className="btn-brand" onClick={doCreate}>Создать</Button>
              </div>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Edit Offcanvas */}
      <Offcanvas show={!!editing} onHide={() => setEditing(null)} placement="end" className="offcanvas-wide offcanvas-user">
        <Offcanvas.Header closeButton className="pb-2 mb-3">
          <Offcanvas.Title>Редактировать товар</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-4">
          <div className="my-auto">
            <div className="form-backdrop">
              <Form className="mb-3">
                <Form.Group className="mb-2">
                  <Form.Label>Название *</Form.Label>
                  <Form.Control
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Описание *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    required
                  />
                </Form.Group>

                <Row className="g-2">
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Цена без наценки (₽) *</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        value={editForm.netPrice}
                        onChange={(e) => setEditForm({ ...editForm, netPrice: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Количество *</Form.Label>
                      <Form.Control
                        type="number"
                        value={editForm.stock}
                        onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="light" onClick={() => setEditing(null)}>Отменить</Button>
                <Button className="btn-brand" onClick={doUpdate}>Сохранить</Button>
              </div>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
