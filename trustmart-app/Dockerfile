FROM node:24-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY --from=frontend /app/dist ./dist
ENV TRUSTMART_DB=/data/trustmart.sqlite PORT=8000 TRUSTMART_DEMO=1 TRUSTMART_SECURE=1
RUN mkdir /data && useradd -u 10001 demo && chown -R demo /app /data
USER demo
EXPOSE 8000
WORKDIR /app/backend
CMD ["python", "-m", "waitress", "--host=0.0.0.0", "--port=8000", "--call", "server:create_app"]
