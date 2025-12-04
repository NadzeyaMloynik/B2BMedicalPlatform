import { useState, useEffect, useMemo } from 'react';
import { Button, Table, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { productService } from '../lib/productService';
import type { Category, Page } from '../lib/types';

export default function Categories() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [data, setData] = useState<Page<Category> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [searchName, setSearchName] = useState<string>('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });

  const [editing, setEditing] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const canPrev = useMemo(() => (data ? data.pageable.pageNumber > 0 : false), [data]);
  const canNext = useMemo(() => (data ? data.pageable.pageNumber + 1 < data.totalPages : false), [data]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page, size, availability: onlyAvailable };
      if (searchName.trim()) params.name = searchName.trim();
      const res = await productService.getAllCategories(params);
      setData(res);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка загрузки категорий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, size, onlyAvailable, searchName]);

  const toggleAvailability = async (category: Category) => {
    try {
      await productService.changeCategoryStatus(category.id, !category.isActive);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Не удалось изменить доступность');
    }
  };

  const doCreate = async () => {
    try {
      await productService.createCategory(createForm);
      setShowCreate(false);
      setCreateForm({ name: '', description: '' });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка создания категории');
    }
  };

  const doUpdate = async () => {
    if (!editing) return;
    try {
      await productService.updateCategory(editing.id, editForm);
      setEditing(null);
      setEditForm({ name: '', description: '' });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка обновления категории');
    }
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setEditForm({
      name: category.name,
      description: category.description || ''
    });
  };

  // Generate random color based on name hash
  const getCategoryColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D5A6BD'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <>
      <div className="page-container">
        <div className="container-fluid">
          <div className="page-header">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h1 className="page-title">Категории товаров</h1>
                <div className="opacity-90">Управление категориями в системе</div>
              </div>
              <Button className="btn btn-light" onClick={() => setShowCreate(true)}>
                + Создать категорию
              </Button>
            </div>
          </div>

          <div className="content-card">
            {error && <Alert variant="danger" className="mb-3" dismissible onClose={() => setError('')}>{error}</Alert>}
            {loading && <div className="text-center py-4"><Spinner /></div>}

            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-3">
                <h4 className="mb-0">Список категорий</h4>
              </div>
              <div className="d-flex align-items-center gap-3">
                <Form className="d-flex" onSubmit={(e) => { e.preventDefault(); setPage(0); }}>
                  <div className="searchbar d-flex position-relative">
                    <Form.Control
                      type="text"
                      placeholder="Поиск категорий..."
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
                <Form.Check
                  type="switch"
                  id="availability-switch"
                  label={onlyAvailable ? 'Только активные' : 'Только заблокированные'}
                  checked={onlyAvailable}
                  onChange={(e) => { setOnlyAvailable(e.target.checked); setPage(0); }}
                />
              </div>
            </div>

            <div className="table-outline">
              <Table className="align-middle table-custom table-bordered">
                <thead className="bg-brand-tablehead text-white">
                  <tr>
                    <th className="text-start">Название</th>
                    <th className="text-start">Описание</th>
                    <th className="text-center">Статус</th>
                    <th className="text-center" style={{ width: '150px' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {(!loading && (!data || (data.content?.length ?? 0) === 0)) && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">Ничего не найдено</td>
                    </tr>
                  )}
                  {data?.content.map(category => (
                    <tr key={category.id}>
                      <td>
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: getCategoryColor(category.name),
                            color: '#fff',
                            fontSize: '0.9rem'
                          }}
                        >
                          {category.name}
                        </span>
                      </td>
                      <td>
                        {category.description ? (
                          <span className="text-muted small">{category.description}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        {category.isActive ? (
                          <span className="badge bg-success">Активна</span>
                        ) : (
                          <span className="badge bg-secondary">Заблокирована</span>
                        )}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1 me-2"
                          onClick={() => openEdit(category)}
                          title="Редактировать"
                        >
                          <i className="bi bi-pencil" />
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1"
                          onClick={() => toggleAvailability(category)}
                          title={category.isActive ? 'Заблокировать' : 'Активировать'}
                        >
                          <i className={`bi ${category.isActive ? 'bi-lock' : 'bi-unlock'}`} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {data && data.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted">
                  Страница {data.pageable.pageNumber + 1} из {data.totalPages} (всего: {data.totalElements})
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={!canPrev}
                    onClick={() => setPage(page - 1)}
                  >
                    <i className="bi bi-chevron-left" />
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={!canNext}
                    onClick={() => setPage(page + 1)}
                  >
                    <i className="bi bi-chevron-right" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Создать категорию</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Название *</Form.Label>
            <Form.Control
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
              maxLength={100}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Описание</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              maxLength={500}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            Отмена
          </Button>
          <Button variant="primary" className="btn-brand" onClick={doCreate}>
            Создать
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={!!editing} onHide={() => setEditing(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Редактировать категорию</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Название *</Form.Label>
            <Form.Control
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
              maxLength={100}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Описание</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              maxLength={500}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Отмена
          </Button>
          <Button variant="primary" className="btn-brand" onClick={doUpdate}>
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
