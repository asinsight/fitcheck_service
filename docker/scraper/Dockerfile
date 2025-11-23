# Syntax=docker/dockerfile:1
FROM public.ecr.aws/lambda/python:3.11

# Copy scraper source code
COPY linkedin_source/ ${LAMBDA_TASK_ROOT}/

# Install Python dependencies
RUN pip install --no-cache-dir \
    boto3 \
    requests

# Set the CMD to your handler
CMD ["scraper.lambda_handler"]
