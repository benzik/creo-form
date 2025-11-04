#!/bin/bash

# Скрипт для упаковки проекта для развертывания на сервере

echo "📦 Создание архива для развертывания на сервере..."

# Имя архива с текущей датой
ARCHIVE_NAME="visual-form-editor-$(date +%Y%m%d-%H%M%S).tar.gz"

# Создаем архив с нужными файлами
tar -czf "$ARCHIVE_NAME" \
  index.html \
  style.css \
  script.js \
  data.js \
  Dockerfile \
  docker-compose.yml \
  nginx.conf \
  .dockerignore \
  README.md \
  DEPLOY.md \
  QUICK_START.md

if [ $? -eq 0 ]; then
    echo "✅ Архив успешно создан: $ARCHIVE_NAME"
    echo ""
    echo "📋 Размер архива:"
    ls -lh "$ARCHIVE_NAME"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "1. Загрузите архив на сервер:"
    echo "   scp $ARCHIVE_NAME user@your-server:/tmp/"
    echo ""
    echo "2. На сервере распакуйте и запустите:"
    echo "   cd /opt && sudo mkdir visual-form-editor"
    echo "   cd visual-form-editor"
    echo "   sudo tar -xzf /tmp/$ARCHIVE_NAME"
    echo "   sudo docker-compose up -d --build"
else
    echo "❌ Ошибка при создании архива"
    exit 1
fi
