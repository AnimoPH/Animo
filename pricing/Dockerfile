# Pinned to 3.11 deliberately, TensorFlow doesn't yet support every new version
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first, before copying the rest of the code.
# Docker caches this layer, so re-building after a code change (not a
# dependency change) skips reinstalling everything from scratch.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the actual service code and the trained model files
COPY api/ ./api/
COPY models/ ./models/

WORKDIR /app/api

EXPOSE 8000

# --host 0.0.0.0 is required inside a container, otherwise the server only
# listens for requests from inside its own container and nothing outside
# (not even your own machine) can reach it
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
