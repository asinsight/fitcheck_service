# Syntax=docker/dockerfile:1
FROM public.ecr.aws/lambda/python:3.11

# Copy analyzer source code
COPY gemini_source/ ${LAMBDA_TASK_ROOT}/

# Install Python dependencies from requirements.txt
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt && \
    pip install --no-cache-dir nltk && \
    python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"

# Set the CMD to your handler
CMD ["analyzer.lambda_handler"]
