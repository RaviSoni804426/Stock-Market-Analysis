# Multi-Stage Build: Host FastAPI and serve pre-built static React assets
FROM python:3.9-slim

# Prevent python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Setup workdir
WORKDIR /app

# Copy dependency specifications and install
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

# Create static asset folder to prevent mount failures if empty
RUN mkdir -p /app/static

# Copy FastAPI backend code
COPY backend/app /app/app

# Copy built frontend assets
COPY static /app/static

# Expose port 7860 (Hugging Face default)
EXPOSE 7860

# Run FastAPI using uvicorn under production configurations
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
