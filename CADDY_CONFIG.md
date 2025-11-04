# 🌐 Настройка Caddy для Docker сети

## ✅ Правильная конфигурация Caddyfile

### Если Caddy и контейнер в одной Docker сети:

```caddy
forms.your-domain.com {
    reverse_proxy visual-form-editor:80
    #              ↑имя контейнера  ↑внутренний порт
    
    encode gzip
}
```

**Важно:** Используйте **имя контейнера** (`visual-form-editor`) и **внутренний порт** (`80`), а НЕ `localhost:8085`!

---

## 🔧 Вариант 1: Добавить контейнер в сеть Caddy (Рекомендуется)

### В Portainer:

1. Откройте стек `visual-form-editor`
2. Нажмите **Editor**
3. Добавьте сеть Caddy к контейнеру:

```yaml
name: visual-form-editor-project

services:
  form-editor:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: visual-form-editor
    ports:
      - "8085:80"
    restart: unless-stopped
    networks:
      - form-editor-network
      - caddy_network  # ← Добавьте сеть Caddy
    healthcheck:
      test: ["CMD", "sh", "-c", "pgrep nginx"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  form-editor-network:
    driver: bridge
  caddy_network:
    external: true  # ← Внешняя сеть Caddy
```

4. Нажмите **Update the stack**

### В Caddyfile:

```caddy
forms.your-domain.com {
    reverse_proxy visual-form-editor:80
}
```

---

## 🔧 Вариант 2: Убрать внешний порт (Безопаснее)

Если используете Caddy, внешний порт 8085 не нужен! Контейнер будет доступен только через Caddy:

```yaml
name: visual-form-editor-project

services:
  form-editor:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: visual-form-editor
    # ports:
    #   - "8085:80"  # ← Закомментировать или удалить
    restart: unless-stopped
    networks:
      - caddy_network  # Только сеть Caddy
    healthcheck:
      test: ["CMD", "sh", "-c", "pgrep nginx"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  caddy_network:
    external: true
```

**Преимущества:**
- ✅ Контейнер доступен только через Caddy (безопаснее)
- ✅ Не занимает внешний порт 8085
- ✅ SSL автоматически через Caddy

---

## 🔧 Вариант 3: Изменить внутренний порт nginx (Если очень нужно)

### 1. Измените nginx.conf:

```nginx
server {
    listen 8085;  # ← Вместо 80
    server_name localhost;
    # остальное без изменений
}
```

### 2. Измените Dockerfile:

```dockerfile
# ...
EXPOSE 8085  # ← Вместо 80
# ...
```

### 3. Измените docker-compose.yml:

```yaml
ports:
  - "8085:8085"  # ← Оба порта 8085
```

### 4. В Caddyfile:

```caddy
forms.your-domain.com {
    reverse_proxy visual-form-editor:8085
}
```

⚠️ **Но это избыточно!** Обычно внутри контейнера можно использовать любой порт, в том числе 80.

---

## 🎯 Рекомендация

Используйте **Вариант 1** или **Вариант 2**:

### Оптимальная конфигурация:

#### docker-compose.yml:
```yaml
name: visual-form-editor-project

services:
  form-editor:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: visual-form-editor
    # Порт 8085 для прямого доступа (опционально)
    ports:
      - "8085:80"
    restart: unless-stopped
    networks:
      - caddy_network  # Сеть Caddy для проксирования
    healthcheck:
      test: ["CMD", "sh", "-c", "pgrep nginx"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  caddy_network:
    external: true
    name: caddy_caddy  # Стандартное имя сети Caddy
```

#### Caddyfile:
```caddy
forms.your-domain.com {
    reverse_proxy visual-form-editor:80
    
    # Опционально: логи
    log {
        output file /var/log/caddy/forms.log
    }
    
    # Опционально: заголовки безопасности
    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }
    
    encode gzip
}
```

---

## 🔍 Проверка настройки

### 1. Узнайте имя сети Caddy:

```bash
docker network ls | grep caddy
```

Обычно это: `caddy_caddy` или `caddy_default`

### 2. Проверьте, что контейнеры в одной сети:

```bash
docker network inspect caddy_caddy
```

Должны быть видны оба контейнера: Caddy и visual-form-editor

### 3. Проверьте доступность из контейнера Caddy:

```bash
docker exec caddy wget -qO- http://visual-form-editor:80
```

Должен вернуть HTML код страницы

---

## ❓ FAQ

### Почему не работает `localhost:8085`?

Внутри Docker сети контейнеры не видят `localhost` хоста. Нужно использовать **имя контейнера**.

### Какое имя сети использовать?

Зависит от вашей установки Caddy:
- `caddy_caddy` - если Caddy через docker-compose
- `caddy_default` - альтернативное имя
- Проверьте: `docker network ls`

### Нужен ли внешний порт 8085?

- **Нет** - если доступ только через Caddy (безопаснее)
- **Да** - если нужен прямой доступ для отладки

---

## 🎉 Итог

**Правильная настройка:**

1. ✅ Добавьте `visual-form-editor` в сеть Caddy
2. ✅ В Caddyfile используйте: `reverse_proxy visual-form-editor:80`
3. ✅ Перезагрузите Caddy: `docker exec caddy caddy reload`
4. ✅ Проверьте: `https://forms.your-domain.com`

**Не меняйте внутренний порт с 80!** Это стандартный порт для nginx, и он прекрасно работает внутри контейнера.
