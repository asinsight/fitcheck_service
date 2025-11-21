# Syntax=docker/dockerfile:1
FROM public.ecr.aws/lambda/python:3.11

# Copy analyzer source code
COPY gemini_source/ ${LAMBDA_TASK_ROOT}/

# Install Python dependencies with compatible versions
RUN pip install --no-cache-dir \
    google-generativeai \
    pypdf==3.17.4 \
    numpy==1.26.4 \
    gensim==4.3.2 \
    scipy==1.10.1 \
    nltk \
    boto3

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"

# Set the CMD to your handler
CMD ["analyzer.lambda_handler"]
