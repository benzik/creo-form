# Используем легкий образ nginx на базе Alpine Linux
FROM nginx:alpine

# Устанавливаем рабочую директорию
WORKDIR /usr/share/nginx/html

# Удаляем дефолтные файлы nginx
RUN rm -rf /usr/share/nginx/html/*

# Копируем все файлы проекта в контейнер
COPY index.html .
COPY style.css .
COPY script.js .
COPY data.js .

# Копируем кастомную конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Экспонируем порт 8085 (внутри контейнера)
EXPOSE 8085

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
