import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Spinner, Row, Col, Card } from 'react-bootstrap';
import { productService } from '../lib/productService';
import { uploadToCloudinary, validateImageFile } from '../lib/imageUpload';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';
import api from '../lib/api';
import type { Category } from '../lib/types';

export default function AddProduct() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    netPrice: '',
    sku: '',
    stock: '',
    categoryId: ''
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
    loadUserProfile();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const categories = await productService.getAllCategories({ page: 0, size: 100, availability: true });
    } catch (err) {
      setError('Ошибка загрузки категорий');
      console.error(err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      if (!accessToken) return;
      
      const decoded: any = jwtDecode(accessToken);
      const email = decoded.sub;
      
      const { data } = await api.get(`/user-service/companies/user/${email}`);
      setCompanyId(data.id);
    } catch (err) {
      console.error('Failed to load company:', err);
      setError('Ошибка загрузки данных компании');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + imageFiles.length > 5) {
      setError('Максимум 5 изображений');
      return;
    }

    // Validate each file
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'Ошибка валидации файла');
        return;
      }
    }

    setImageFiles((prev) => [...prev, ...files]);

    // Create previews
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Upload images to Cloudinary
      const imageUrls: string[] = [];
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileName = `product_${formData.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}_${i}`;
        const url = await uploadToCloudinary(file, fileName);
        imageUrls.push(url);
      }
      
      if (!companyId) {
        setError('Не удалось определить компанию пользователя');
        return;
      }

      const productDto = {
        companyId,
        name: formData.name,
        description: formData.description,
        netPrice: parseFloat(formData.netPrice),
        sku: formData.sku || `SKU-${Date.now()}`,
        stock: parseInt(formData.stock, 10),
        categoryId: parseInt(formData.categoryId, 10),
        imageUrls
      };

      await productService.createProduct(productDto);
      navigate('/products');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Ошибка при создании товара');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCategories) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Добавить товар</h2>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="content-card">
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Название товара *</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  maxLength={255}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Категория *</Form.Label>
                <Form.Select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Описание *</Form.Label>
            <Form.Control
              as="textarea"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              required
              maxLength={1000}
            />
          </Form.Group>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Цена без наценки (₽) *</Form.Label>
                <Form.Control
                  type="number"
                  name="netPrice"
                  step="0.01"
                  min="0"
                  value={formData.netPrice}
                  onChange={handleInputChange}
                  required
                />
                <Form.Text className="text-muted">
                  Наценка 7% будет добавлена автоматически
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Количество на складе *</Form.Label>
                <Form.Control
                  type="number"
                  name="stock"
                  min="0"
                  value={formData.stock}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Артикул (SKU)</Form.Label>
                <Form.Control
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="Оставьте пустым для автогенерации"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Изображения (до 5 штук)</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              disabled={imageFiles.length >= 5}
            />
            <Form.Text className="text-muted">
              Загружено: {imageFiles.length} / 5
            </Form.Text>
          </Form.Group>

          {imagePreviews.length > 0 && (
            <div className="mb-3">
              <Form.Label>Предпросмотр изображений:</Form.Label>
              <Row className="g-3">
                {imagePreviews.map((preview, index) => (
                  <Col xs={6} md={4} lg={3} key={index}>
                    <Card>
                      <Card.Img
                        variant="top"
                        src={preview}
                        style={{ height: '150px', objectFit: 'cover' }}
                      />
                      <Card.Body className="p-2">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveImage(index)}
                          className="w-100"
                        >
                          <i className="bi bi-trash"></i> Удалить
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}

          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Отмена
            </Button>
            <Button variant="primary" className="btn-brand" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Создание...
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle me-2"></i>Создать товар
                </>
              )}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
