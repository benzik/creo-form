# ⚡ Быстрый старт

## 🏠 Локально

```bash
# Запуск
docker-compose up -d --build

# Открыть в браузере
http://localhost:8085

# Остановка
docker-compose down

# Логи
docker logs -f visual-form-editor
```

---

## 🖥️ На сервере через Portainer

```bash
# 1. Убедитесь, что есть общая сеть
docker network ls | grep caddy

# 2. Создайте сеть, если нужно
docker network create caddy_network

# 3. В Portainer:
# - Stacks → Add stack
# - Repository: https://github.com/benzik/creo-form
# - Compose path: docker-compose.yml
# - Deploy

# 4. Проверить статус
docker ps | grep visual-form-editor

# 5. Настроить Caddy (см. CADDY.md)
```

## 🖥️ На сервере (ручное развертывание)

```bash
# Перейти в директорию проекта
cd /opt/visual-form-editor

# Создать сеть (если нужно)
docker network create caddy_network

# Запустить
sudo docker-compose up -d --build

# Проверить статус
sudo docker ps

# Проверить логи
sudo docker logs visual-form-editor

# Открыть порт в файрволе (опционально)
sudo ufw allow 8085/tcp
sudo ufw reload
```

---

## 🔧 Настройка Caddy для поддомена

**Добавьте в Caddyfile:**

```caddy
forms.your-domain.com {
    reverse_proxy visual-form-editor:8085
}
```

**Перезагрузите Caddy:**

```bash
# Docker
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Systemd
sudo systemctl reload caddy
```

📖 **Подробнее:** [CADDY.md](CADDY.md)

---

## 🔧 Смена порта

**Отредактируйте `docker-compose.yml`:**

```yaml
ports:
  - "9090:8085"  # Внешний:Внутренний
```

---

## 📦 Быстрое создание архива для сервера

```bash
tar -czf visual-form-editor.tar.gz \
  index.html style.css script.js data.js \
  Dockerfile docker-compose.yml nginx.conf .dockerignore
```

---

## 🔄 Обновление на сервере

```bash
# Остановить контейнер
sudo docker-compose down

# Обновить файлы (git pull или загрузить новые)

# Пересобрать и запустить
sudo docker-compose up -d --build
```

---

## 📊 Полезные команды

```bash
# Статус всех контейнеров
docker ps -a

# Использование ресурсов
docker stats visual-form-editor

# Очистка неиспользуемых образов
docker system prune -a

# Перезапуск
docker-compose restart

# Остановка без удаления
docker-compose stop

# Запуск после остановки
docker-compose start
```

---

## ✅ Проверка работоспособности

```bash
# Локально
curl -I http://localhost:8085

# На сервере (внутри)
curl -I http://localhost:8085

# На сервере (снаружи)
curl -I http://YOUR_SERVER_IP:8085
```

---

## 🆘 Если что-то пошло не так

```bash
# Смотрим логи
docker logs visual-form-editor --tail 50

# Перезапускаем
docker-compose restart

# Полная переустановка
docker-compose down
docker-compose up -d --build --force-recreate
```
