# 🌐 Настройка Caddy для проксирования на поддомен

## 📋 Предварительные требования

1. ✅ Контейнер `visual-form-editor` запущен в Portainer
2. ✅ Контейнер подключен к общей сети (например: `caddy_network`)
3. ✅ Caddy установлен и работает на сервере

---

## 🔗 Способ 1: Через имя контейнера (Рекомендуется)

Этот способ работает, когда Caddy и приложение находятся в одной Docker-сети.

### Caddyfile:

```caddy
forms.your-domain.com {
    reverse_proxy visual-form-editor:8085
    
    # Логирование
    log {
        output file /var/log/caddy/forms.log
        format json
    }
    
    # Сжатие
    encode gzip zstd
    
    # Кастомные заголовки
    header {
        # Безопасность
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

### Преимущества:
- ✅ Не требуется проброс порта наружу
- ✅ Быстрее (прямое соединение через Docker-сеть)
- ✅ Безопаснее (порт не доступен извне)

---

## 🔗 Способ 2: Через localhost

Используйте, если Caddy работает на хосте (не в Docker).

### Caddyfile:

```caddy
forms.your-domain.com {
    reverse_proxy localhost:8085
    
    log {
        output file /var/log/caddy/forms.log
    }
    
    encode gzip
}
```

---

## 🔗 Способ 3: Через IP-адрес хоста

Если нужно явно указать IP:

```caddy
forms.your-domain.com {
    reverse_proxy 127.0.0.1:8085
    
    log {
        output file /var/log/caddy/forms.log
    }
    
    encode gzip
}
```

---

## 🚀 Применение конфигурации

### Caddy в Docker

```bash
# Перезагрузка конфигурации
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Проверка конфигурации
docker exec caddy caddy validate --config /etc/caddy/Caddyfile

# Просмотр логов
docker logs -f caddy
```

### Caddy на хосте (systemd)

```bash
# Проверка конфигурации
caddy validate --config /etc/caddy/Caddyfile

# Перезагрузка
sudo systemctl reload caddy

# Или полный рестарт
sudo systemctl restart caddy

# Проверка статуса
sudo systemctl status caddy

# Просмотр логов
sudo journalctl -u caddy -f
```

---

## 🔍 Проверка работоспособности

### 1. Проверка DNS

```bash
nslookup forms.your-domain.com
# Должен вернуть IP вашего сервера
```

### 2. Проверка доступности

```bash
# Внутри Docker-сети
docker exec caddy wget -qO- http://visual-form-editor:8085

# Через localhost
curl http://localhost:8085

# Через домен
curl https://forms.your-domain.com
```

### 3. Проверка SSL-сертификата

```bash
curl -I https://forms.your-domain.com
# Должен вернуть 200 OK с HTTPS
```

---

## 🛠️ Troubleshooting

### Ошибка: "no such host"

**Проблема:** Caddy не может найти контейнер по имени

**Решение:**

1. Проверьте, что контейнер запущен:
   ```bash
   docker ps | grep visual-form-editor
   ```

2. Проверьте, что Caddy и контейнер в одной сети:
   ```bash
   docker network inspect caddy_network
   ```

3. Убедитесь, что имя контейнера правильное:
   ```bash
   docker ps --format "{{.Names}}"
   ```

### Ошибка: "connection refused"

**Проблема:** Порт 8085 не отвечает

**Решение:**

1. Проверьте логи контейнера:
   ```bash
   docker logs visual-form-editor
   ```

2. Проверьте, что nginx слушает на 8085:
   ```bash
   docker exec visual-form-editor netstat -tlnp | grep 8085
   ```

3. Проверьте health check:
   ```bash
   docker inspect visual-form-editor | grep -A 10 Health
   ```

### Ошибка: SSL-сертификат не выдается

**Проблема:** Let's Encrypt не может получить сертификат

**Решение:**

1. Проверьте, что порты 80 и 443 открыты:
   ```bash
   sudo ufw status
   sudo netstat -tlnp | grep -E ':80|:443'
   ```

2. Проверьте DNS записи:
   ```bash
   dig forms.your-domain.com
   ```

3. Проверьте логи Caddy:
   ```bash
   docker logs caddy | grep -i error
   ```

---

## 📊 Примеры расширенной конфигурации

### С базовой аутентификацией

```caddy
forms.your-domain.com {
    basicauth {
        admin $2a$14$hashed_password_here
    }
    
    reverse_proxy visual-form-editor:8085
}
```

### С IP-ограничением

```caddy
forms.your-domain.com {
    @allowed {
        remote_ip 192.168.1.0/24 10.0.0.0/8
    }
    
    handle @allowed {
        reverse_proxy visual-form-editor:8085
    }
    
    handle {
        abort
    }
}
```

### С несколькими доменами

```caddy
forms.your-domain.com form.your-domain.com {
    reverse_proxy visual-form-editor:8085
    
    log {
        output file /var/log/caddy/forms.log
    }
}
```

### С кастомными таймаутами

```caddy
forms.your-domain.com {
    reverse_proxy visual-form-editor:8085 {
        transport http {
            dial_timeout 10s
            response_header_timeout 20s
        }
        
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

---

## 📝 Полная рекомендуемая конфигурация

```caddy
forms.your-domain.com {
    # Проксирование на контейнер
    reverse_proxy visual-form-editor:8085 {
        # Заголовки
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
        
        # Health check
        health_uri /
        health_interval 30s
        health_timeout 5s
    }
    
    # Логирование
    log {
        output file /var/log/caddy/forms.log {
            roll_size 10mb
            roll_keep 5
        }
        format json
        level INFO
    }
    
    # Сжатие
    encode gzip zstd
    
    # Безопасность
    header {
        # HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # Защита от XSS
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        
        # CSP (настройте под свои нужды)
        Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://flagcdn.com; img-src 'self' data: blob: https://flagcdn.com;"
        
        # Другие заголовки
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        
        # Удалить заголовок сервера
        -Server
    }
    
    # Кэширование статики (опционально)
    @static {
        path *.css *.js *.jpg *.jpeg *.png *.gif *.ico *.svg *.woff *.woff2
    }
    header @static Cache-Control "public, max-age=31536000"
}
```

---

## ✅ Проверочный чеклист

- [ ] DNS настроен и указывает на сервер
- [ ] Контейнер `visual-form-editor` запущен
- [ ] Контейнер в сети `caddy_network` (или вашей общей сети)
- [ ] Caddy настроен и работает
- [ ] Конфигурация Caddyfile обновлена
- [ ] Caddy перезагружен: `caddy reload`
- [ ] Порты 80 и 443 открыты в файрволе
- [ ] Сайт доступен по HTTPS
- [ ] SSL-сертификат выдан автоматически
- [ ] Все работает! 🎉

---

## 📞 Дополнительная информация

- **Документация Caddy:** https://caddyserver.com/docs/
- **Reverse Proxy:** https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- **TLS:** https://caddyserver.com/docs/automatic-https
