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

## 🖥️ На сервере (после загрузки файлов)

```bash
# Перейти в директорию проекта
cd /opt/visual-form-editor

# Запустить
sudo docker-compose up -d --build

# Проверить статус
sudo docker ps

# Проверить логи
sudo docker logs visual-form-editor

# Открыть порт в файрволе
sudo ufw allow 8085/tcp
sudo ufw reload
```

---

## 🔧 Смена порта

**Отредактируйте `docker-compose.yml`:**

```yaml
ports:
  - "9090:80"  # Меняйте 9090 на нужный порт
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
