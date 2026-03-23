# Используем официальный образ Python
FROM python:3.12-slim

# Устанавливаем системные зависимости (нужны для сборки psycopg2 и других библиотек)
RUN apt-get update && apt-get install -y \
	build-essential \
	libpq-dev \
	&& rm -rf /var/lib/apt/lists/*

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем файл зависимостей
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь код проекта в контейнер
COPY . .

# Собираем статические файлы (важно для админки Django)
# Делаем это с фиктивным SECRET_KEY, так как на этапе сборки реальный .env недоступен
RUN DJANGO_SETTINGS_MODULE=config.settings \
	SECRET_KEY=dummy_key_for_build \
	python manage.py collectstatic --noinput

# Указываем порт, на котором будет работать Cloud Run (по умолчанию 8080)
EXPOSE 8080

# Команда для запуска сервера с помощью gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "config.wsgi:application"]