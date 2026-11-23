# LibreOffice is installed once when the image is built, not per CV.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer fonts-liberation fonts-crosextra-carlito \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY cv_render_qa.py /app/cv_render_qa.py
COPY cv_generate.py /app/cv_generate.py
RUN useradd -m cvworker
USER cvworker
ENTRYPOINT ["python", "/app/cv_render_qa.py"]
