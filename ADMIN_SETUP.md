# Автоматическое создание администратора

При запуске приложения через Docker или первом запуске, автоматически создаётся администратор системы.

## Учётные данные администратора

- **Email**: `admin@uni.com`
- **Пароль**: `admin123`
- **Роль**: ADMIN

## Созданные миграции

### User Service
**Файл**: `user-service/src/main/resources/db/changelog/changeset/05_create_admin_user.yml`

Создаёт:
- Компанию "Admin Company" типа ADMIN
- Пользователя с email `admin@uni.com`

### Authentication Service
**Файл**: `authentication/src/main/resources/db/changelog/changeset/04_create_admin_credentials.yml`

Создаёт:
- Учётные данные для входа (email + BCrypt хэш пароля)
- Связь пользователя с ролью ADMIN

## Смена пароля администратора

Если вы хотите изменить пароль администратора по умолчанию:

1. Сгенерируйте новый BCrypt хэш (strength 10):
   ```java
   String hash = new BCryptPasswordEncoder(10).encode("your_new_password");
   System.out.println(hash);
   ```
   
   Или используйте онлайн-генератор: https://bcrypt-generator.com/

2. Замените значение в файле `04_create_admin_credentials.yml`:
   ```yaml
   - column:
       name: password
       value: $2a$10$YOUR_NEW_HASH_HERE
   ```

## Rollback

Если нужно откатить изменения:

```bash
# Для user-service
./mvnw liquibase:rollback -Dliquibase.rollbackCount=1

# Для authentication
cd authentication
./mvnw liquibase:rollback -Dliquibase.rollbackCount=1
```

## Безопасность

⚠️ **ВАЖНО**: После первого входа в production environment обязательно смените пароль администратора!

Для production рекомендуется:
1. Использовать более сложный пароль
2. Настроить 2FA (если реализовано)
3. Ограничить доступ к панели администратора по IP
