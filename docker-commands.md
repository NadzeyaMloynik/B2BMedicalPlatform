# Docker Quick Start Commands

## Запуск всего приложения (один раз)
```bash
docker-compose up --build -d
```

## Остановка всего приложения
```bash
docker-compose down
```

## Просмотр статуса
```bash
docker-compose ps
```

## Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f frontend
docker-compose logs -f gateway
docker-compose logs -f authentication
docker-compose logs -f product-service
docker-compose logs -f user-service
```

## Перезапуск сервиса
```bash
docker-compose restart <service-name>
```

## Пересборка и перезапуск конкретного сервиса
```bash
docker-compose up --build -d <service-name>
```

## Доступ к приложению
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8080

## Очистка (с удалением данных БД)
```bash
docker-compose down -v
```
