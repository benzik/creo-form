# 🚀 Инструкция по развертыванию на сервере

## ✅ Локальное тестирование пройдено успешно!

Приложение успешно запущено локально на порту **8085** и работает корректно.

---

## 📋 Подготовка к развертыванию на сервере

### 1. Предварительные требования на сервере

- **Docker** (версия 20.10 или выше)
- **Docker Compose** (версия 2.0 или выше)
- Открытый порт 8085 (или другой на ваш выбор)

### 2. Установка Docker на сервере (если еще не установлен)

```bash
# Для Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# Установка Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

---

## 🔄 Варианты развертывания

### Вариант 1: Через Git (Рекомендуется)

1. **Инициализируйте Git репозиторий локально:**

```bash
cd "/Users/lideraagency/Downloads/ФОРМЫ ЗАПОЛНЕНИЯ"
git init
git add .
git commit -m "Initial commit"
```

2. **Добавьте удаленный репозиторий** (GitHub/GitLab/Bitbucket):

```bash
git remote add origin ВАШ_GIT_URL
git push -u origin main
```

3. **На сервере клонируйте репозиторий:**

```bash
cd /opt
sudo git clone ВАШ_GIT_URL visual-form-editor
cd visual-form-editor
```

4. **Запустите контейнер:**

```bash
sudo docker-compose up -d --build
```

---

### Вариант 2: Прямая загрузка файлов на сервер

1. **Создайте архив проекта:**

```bash
cd "/Users/lideraagency/Downloads/ФОРМЫ ЗАПОЛНЕНИЯ"
tar -czf visual-form-editor.tar.gz \
  index.html \
  style.css \
  script.js \
  data.js \
  Dockerfile \
  docker-compose.yml \
  nginx.conf \
  .dockerignore
```

2. **Загрузите на сервер через scp:**

```bash
scp visual-form-editor.tar.gz user@your-server:/tmp/
```

3. **На сервере распакуйте и запустите:**

```bash
ssh user@your-server
cd /opt
sudo mkdir visual-form-editor
cd visual-form-editor
sudo tar -xzf /tmp/visual-form-editor.tar.gz
sudo docker-compose up -d --build
```

---

## 🔧 Настройка порта на сервере

Если порт 8085 занят или вы хотите использовать другой порт:

**Отредактируйте `docker-compose.yml`:**

```yaml
ports:
  - "НОВЫЙ_ПОРТ:80"  # Например: "9090:80"
```

---

## 📊 Проверка работы на сервере

```bash
# Проверка статуса контейнера
sudo docker ps

# Проверка логов
sudo docker logs visual-form-editor

# Проверка доступности
curl -I http://localhost:8085

# Для доступа извне
curl -I http://YOUR_SERVER_IP:8085
```

---

## 🔒 Настройка файрвола (если нужно)

```bash
# Для UFW (Ubuntu)
sudo ufw allow 8085/tcp
sudo ufw reload

# Для firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=8085/tcp
sudo firewall-cmd --reload
```

---

## 🔄 Управление контейнером на сервере

```bash
# Остановка
sudo docker-compose down

# Перезапуск
sudo docker-compose restart

# Просмотр логов в реальном времени
sudo docker logs -f visual-form-editor

# Обновление (после изменения кода)
sudo docker-compose down
sudo docker-compose up -d --build
```

---

## 🌐 Настройка reverse proxy (опционально)

Если вы хотите использовать доменное имя, настройте Nginx на хосте:

**Создайте конфигурацию `/etc/nginx/sites-available/form-editor`:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8085;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Активируйте конфигурацию:**

```bash
sudo ln -s /etc/nginx/sites-available/form-editor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📈 Мониторинг и автозапуск

Контейнер настроен с `restart: unless-stopped`, что означает:
- ✅ Автоматический перезапуск при сбое
- ✅ Автозапуск при перезагрузке сервера
- ✅ Health check каждые 30 секунд

---

## ❓ Troubleshooting

### Контейнер не запускается

```bash
sudo docker logs visual-form-editor
```

### Порт уже занят

```bash
# Найти процесс на порту
sudo lsof -i :8085
# или
sudo netstat -tulpn | grep 8085
```

### Проблемы с памятью

```bash
# Очистка неиспользуемых образов
sudo docker system prune -a
```

---

## 📝 Итоговая структура на сервере

```
/opt/visual-form-editor/
├── index.html
├── style.css
├── script.js
├── data.js
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── .dockerignore
```

---

## ✅ Чек-лист развертывания

- [ ] Docker и Docker Compose установлены на сервере
- [ ] Файлы проекта загружены на сервер
- [ ] Порт 8085 свободен (или выбран другой)
- [ ] Файрвол настроен (если используется)
- [ ] Контейнер запущен: `sudo docker-compose up -d --build`
- [ ] Приложение доступно: `http://YOUR_SERVER_IP:8085`
- [ ] Логи проверены: `sudo docker logs visual-form-editor`

---

## 🎉 Готово!

После развертывания приложение будет доступно по адресу:
- **Локально:** http://localhost:8085
- **На сервере:** http://YOUR_SERVER_IP:8085
- **С доменом:** http://your-domain.com (если настроен reverse proxy)
