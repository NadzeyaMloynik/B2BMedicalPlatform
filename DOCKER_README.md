# Docker Deployment Guide

Этот проект состоит из микросервисной архитектуры с возможностью запуска как отдельных сервисов, так и всего приложения целиком.

## Структура проекта

- **authentication** - Сервис аутентификации (Gradle + PostgreSQL)
- **user-service** - Сервис управления пользователями (Maven + PostgreSQL + Redis)
- **product-service** - Сервис управления товарами (Maven + PostgreSQL)
- **gateway** - API Gateway (Maven)
- **frontend** - React приложение (Vite + Nginx)

## Порты сервисов

| Сервис | Порт |
|--------|------|
| Frontend | 3000 |
| Gateway | 8080 |
| Authentication | 8081 |
| Product Service | 8082 |
| User Service | 8083 |
| Redis | 6379 |
| Auth DB (PostgreSQL) | 5434 |
| User DB (PostgreSQL) | 5432 |
| Product DB (PostgreSQL) | 5435 |

## Запуск всего приложения

### Способ 1: Docker Compose (рекомендуется)

Из корневой директории проекта:

```bash
# Собрать и запустить все сервисы
docker-compose up --build

# Запустить в фоновом режиме
docker-compose up -d --build

# Остановить все сервисы
docker-compose down

# Остановить и удалить volumes (БД будут очищены)
docker-compose down -v
```

### Способ 2: Отдельные команды для каждого сервиса

#### Authentication Service
```bash
cd authentication
docker-compose up --build
```

#### User Service
```bash
cd user-service
docker-compose up --build
```

#### Product Service
```bash
cd product-service
docker-compose up --build
```

#### Gateway
```bash
cd gateway
docker-compose up --build
```

#### Frontend
```bash
cd frontend
docker-compose up --build
```

## Сборка отдельных Docker образов

Если нужно собрать только образы без запуска:

### Authentication Service
```bash
cd authentication
docker build -t authentication-service:1.0 .
```

### User Service
```bash
cd user-service
docker build -t user-service:1.0 .
```

### Product Service
```bash
cd product-service
docker build -t product-service:1.0 .
```

### Gateway
```bash
cd gateway
docker build -t gateway:1.0 .
```

### Frontend
```bash
cd frontend
docker build -t frontend:1.0 .
```

## Проверка работоспособности

После запуска всех сервисов:

1. **Frontend**: http://localhost:3000
2. **Gateway API**: http://localhost:8080
3. **Authentication API**: http://localhost:8081
4. **Product Service API**: http://localhost:8082
5. **User Service API**: http://localhost:8083

## Логи и отладка

### Просмотр логов всех сервисов
```bash
docker-compose logs -f
```

### Просмотр логов конкретного сервиса
```bash
docker-compose logs -f <service-name>

# Примеры:
docker-compose logs -f frontend
docker-compose logs -f gateway
docker-compose logs -f authentication
docker-compose logs -f product-service
docker-compose logs -f user-service
```

### Проверка статуса контейнеров
```bash
docker-compose ps
```

### Перезапуск конкретного сервиса
```bash
docker-compose restart <service-name>
```

## Переменные окружения

### Authentication Service
- `SPRING_DATASOURCE_URL` - URL базы данных PostgreSQL
- `SPRING_DATASOURCE_USERNAME` - Имя пользователя БД
- `SPRING_DATASOURCE_PASSWORD` - Пароль БД

### User Service
- `SPRING_DATASOURCE_URL` - URL базы данных PostgreSQL
- `SPRING_DATASOURCE_USERNAME` - Имя пользователя БД
- `SPRING_DATASOURCE_PASSWORD` - Пароль БД
- `SPRING_DATA_REDIS_HOST` - Хост Redis
- `SPRING_DATA_REDIS_PORT` - Порт Redis
- `SPRING_DATA_REDIS_PASSWORD` - Пароль Redis

### Product Service
- `SPRING_DATASOURCE_URL` - URL базы данных PostgreSQL
- `SPRING_DATASOURCE_USERNAME` - Имя пользователя БД
- `SPRING_DATASOURCE_PASSWORD` - Пароль БД

### Gateway
- `AUTHENTICATION_SERVICE_URL` - URL сервиса аутентификации
- `USER_SERVICE_URL` - URL пользовательского сервиса
- `PRODUCT_SERVICE_URL` - URL сервиса товаров

## Очистка

### Удалить все контейнеры и volumes
```bash
docker-compose down -v
```

### Удалить все образы проекта
```bash
docker rmi authentication-service:1.0 user-service:1.0 product-service:1.0 gateway:1.0 frontend:1.0
```

### Полная очистка Docker системы (ОСТОРОЖНО!)
```bash
docker system prune -a --volumes
```

## Troubleshooting

### Проблема: Контейнер не запускается
1. Проверьте логи: `docker-compose logs <service-name>`
2. Убедитесь, что порты не заняты другими приложениями
3. Проверьте, что базы данных запустились: `docker-compose ps`

### Проблема: Сервисы не могут подключиться друг к другу
1. Убедитесь, что все сервисы находятся в одной Docker сети
2. Проверьте healthcheck статус БД: `docker-compose ps`
3. Проверьте зависимости в docker-compose.yml

### Проблема: Frontend не может достучаться до API
1. Проверьте, что gateway запущен
2. Убедитесь, что nginx.conf правильно настроен
3. Проверьте переменные окружения frontend

## Разработка

Для разработки рекомендуется:
1. Запускать только необходимые сервисы
2. Использовать volume mapping для hot-reload
3. Запускать БД в Docker, а сервисы локально

Пример запуска только БД:
```bash
docker-compose up auth-db user-db product-db redis -d
```

Затем запускайте сервисы локально из IDE.
