# FitCheck PoC - AI-Powered Resume Analysis

A serverless AWS infrastructure for analyzing candidate resumes against job descriptions using AI, combining LinkedIn job data scraping with Gemini-powered analysis to generate comprehensive HTML reports.

## Purpose

FitCheck automates the resume screening process by:
- Scraping job descriptions from LinkedIn using BrightData
- Analyzing candidate CVs against job requirements using Google Gemini AI
- Calculating semantic similarity scores using NLP (Word2Vec)
- Generating beautiful, responsive HTML reports with actionable insights

## Architecture

### High-Level Flow
```
User → API Gateway → Scraper Lambda → BrightData API
                                          ↓
User → Function URL → Analyzer Lambda → Gemini API
                          ↑
                   CV PDF + Job URL
                          ↓
                   HTML Report
```

### Components

1. **Scraper Lambda** ([linkedin_source/scraper.py](linkedin_source/scraper.py))
   - Collects job data from LinkedIn via BrightData API
   - Supports multiple dataset types (jobs, profiles, companies)
   - Protected by API Gateway API Key
   - Returns JSON job description data

2. **Analyzer Lambda** ([gemini_source/analyzer.py](gemini_source/analyzer.py))
   - Accepts CV (PDF) and job URL
   - Extracts text from PDF and scrapes job description
   - Performs NLP analysis (tokenization, stemming, Word2Vec similarity)
   - Uses Gemini 2.5 Flash for AI-powered analysis
   - Generates responsive HTML report with:
     - Similarity score visualization
     - Candidate strengths
     - Gap analysis
     - Actionable consulting advice
   - Protected by custom `x-fitcheck-auth` header

3. **API Gateway**
   - `POST /scrape?type={type}` - Job scraping endpoint (API key protected)
   - Usage plan: 10,000 requests/month, burst 100, rate 50 req/sec

4. **Lambda Function URL**
   - Direct HTTPS endpoint for Analyzer Lambda
   - CORS enabled for web applications
   - Application-level authentication

5. **AWS Secrets Manager**
   - Stores BrightData API credentials
   - Stores Google Gemini API key

## Project Structure

```
fitcheck_poc/
├── gemini_source/
│   ├── analyzer.py              # Analyzer Lambda function
│   ├── template.html            # HTML report template
│   └── Dockerfile               # (legacy, see docker/)
├── linkedin_source/
│   ├── scraper.py               # Scraper Lambda function
│   └── Dockerfile               # (legacy, see docker/)
├── docker/
│   ├── analyzer/
│   │   └── Dockerfile           # Containerized Analyzer Lambda
│   └── scraper/
│       └── Dockerfile           # Containerized Scraper Lambda
├── terraform/
│   ├── apigateway.tf            # API Gateway configuration
│   ├── lambda.tf                # Lambda function definitions
│   ├── iam.tf                   # IAM roles and policies
│   ├── outputs.tf               # Terraform outputs
│   ├── providers.tf             # AWS provider configuration
│   ├── variables.tf             # Input variables
│   └── versions.tf              # Terraform version constraints
├── terraform_ecr/
│   └── ecr.tf                   # ECR repository setup
├── test/
│   ├── test_scraper.py          # Scraper integration tests
│   ├── test_analyzer.py         # Analyzer integration tests
│   └── .env                     # Test environment variables
└── README.md
```

### Pattern Description

- **Modular Docker Images**: Separate containers for scraper and analyzer
- **Infrastructure as Code**: Terraform for reproducible AWS deployments
- **Security First**: API keys, usage plans, and custom authentication headers
- **Serverless**: No server management, pay-per-use pricing
- **AI-Powered**: Leverages Google Gemini for intelligent analysis

## Requirements

### Tools
- [Terraform](https://www.terraform.io/downloads) >= 1.0
- [Docker](https://www.docker.com/get-started) >= 20.10
- [AWS CLI](https://aws.amazon.com/cli/) >= 2.0
- Python 3.11 (for local testing)

### AWS Resources
- AWS Account with appropriate permissions
- ECR repositories for Docker images
- Lambda execution role
- API Gateway
- Secrets Manager

### Third-Party APIs
- [BrightData](https://brightdata.com/) account and API key
- [Google AI Studio](https://aistudio.google.com/) Gemini API key

## Setup

### 1. Configure AWS Credentials

Create an AWS CLI profile:

```bash
aws configure --profile fitcheck-deploy
# Enter your AWS Access Key ID, Secret Access Key, and region (us-east-1)
```

### 2. Store API Credentials

Create secrets in AWS Secrets Manager:

```bash
# BrightData API key
aws secretsmanager create-secret \
  --name brightdata-api-key \
  --secret-string '{"api_key":"your-brightdata-api-key"}' \
  --region us-east-1 \
  --profile fitcheck-deploy

# Google Gemini API key
aws secretsmanager create-secret \
  --name gemini-key \
  --secret-string '{"api_key":"your-gemini-api-key"}' \
  --region us-east-1 \
  --profile fitcheck-deploy
```

### 3. Create ECR Repositories

```bash
cd terraform_ecr
terraform init
terraform plan
terraform apply
```

Note the ECR repository URLs from the output.

### 4. Build and Push Docker Images

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 --profile fitcheck-deploy | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push Analyzer image
docker build -t fitcheck-analyzer:latest -f docker/analyzer/Dockerfile .
docker tag fitcheck-analyzer:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/fitcheck-analyzer-repo:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/fitcheck-analyzer-repo:latest

# Build and push Scraper image
docker build -t fitcheck-scraper:latest -f docker/scraper/Dockerfile .
docker tag fitcheck-scraper:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/fitcheck-scraper-repo:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/fitcheck-scraper-repo:latest
```

### 5. Deploy Main Infrastructure

```bash
cd terraform
terraform init
terraform plan -var="app_client_secret=YOUR_RANDOM_SECRET_HERE"
terraform apply -var="app_client_secret=YOUR_RANDOM_SECRET_HERE"
```

Generate a strong secret:
```bash
# Linux/macOS
openssl rand -hex 32

# Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### 6. Retrieve Credentials

After deployment, get the API endpoints and credentials:

```bash
# API Gateway endpoint
terraform output api_endpoint

# Scraper API Key
terraform output scraper_api_key

# Analyzer Function URL
terraform output analyzer_function_url
```

## Usage

### Scrape Job Data

```bash
curl -X POST "https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com/scrape?type=jobs_by_url" \
  -H "x-api-key: <SCRAPER_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '[{"url": "https://www.linkedin.com/jobs/view/1234567890"}]'
```

### Analyze Resume

```bash
# Encode your PDF to base64
export CV_BASE64=$(cat resume.pdf | base64 -w 0)

curl -X POST "<ANALYZER_FUNCTION_URL>" \
  -H "x-fitcheck-auth: <APP_CLIENT_SECRET>" \
  -H "Content-Type: application/json" \
  -d "{
    \"cv_pdf\": \"$CV_BASE64\",
    \"job_url\": \"https://www.linkedin.com/jobs/view/1234567890\"
  }" > report.html

# Open the HTML report in your browser
open report.html  # macOS
start report.html  # Windows
xdg-open report.html  # Linux
```

### Python Example

```python
import requests
import base64

# Read and encode PDF
with open('resume.pdf', 'rb') as f:
    cv_base64 = base64.b64encode(f.read()).decode('utf-8')

# Call Analyzer
response = requests.post(
    'https://your-function-url.lambda-url.us-east-1.on.aws/',
    headers={
        'x-fitcheck-auth': 'your-app-client-secret',
        'Content-Type': 'application/json'
    },
    json={
        'cv_pdf': cv_base64,
        'job_url': 'https://www.linkedin.com/jobs/view/1234567890'
    }
)

# Save HTML report
with open('report.html', 'w', encoding='utf-8') as f:
    f.write(response.text)
```

## Configuration

### Variables

Key Terraform variables (see `terraform/variables.tf`):

| Variable | Description | Default |
|----------|-------------|---------|
| `app_client_secret` | Authentication secret for Analyzer | (required) |
| `allowed_origins` | CORS origins for Analyzer | `["*"]` |

### Environment Variables (Lambda)

**Scraper Lambda**:
- `BRIGHTDATA_SECRET_NAME`: Name of BrightData secret in Secrets Manager

**Analyzer Lambda**:
- `GEMINI_SECRET_NAME`: Name of Gemini API secret in Secrets Manager
- `APP_CLIENT_SECRET`: Authentication secret for Function URL

## Outputs

After `terraform apply`, you'll get:

| Output | Description |
|--------|-------------|
| `api_endpoint` | API Gateway endpoint for scraper |
| `scraper_api_key` | API Key for scraper endpoint (sensitive) |
| `analyzer_function_url` | Direct HTTPS URL for analyzer |

## Security Considerations

- **API Keys**: Scraper uses AWS-managed API Gateway API Keys
- **Custom Auth**: Analyzer uses application-level `x-fitcheck-auth` header validation
- **Secrets**: All API credentials stored in AWS Secrets Manager
- **CORS**: Configure `allowed_origins` to restrict web access
- **Usage Plans**: Rate limiting prevents abuse (10K/month, 50 req/sec)
- **HTTPS Only**: All endpoints are HTTPS

## Troubleshooting

### View Lambda Logs

```bash
# Scraper logs
aws logs tail /aws/lambda/fitcheck-scraper --follow --profile fitcheck-deploy

# Analyzer logs
aws logs tail /aws/lambda/fitcheck-analyzer --follow --profile fitcheck-deploy
```

### Test Endpoints

```bash
# Test scraper health (should return 400 without proper params)
curl -X POST "https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com/scrape" \
  -H "x-api-key: <SCRAPER_API_KEY>"

# Test analyzer auth (should return 401 without auth header)
curl -X POST "<ANALYZER_FUNCTION_URL>"
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid `x-fitcheck-auth` | Check `APP_CLIENT_SECRET` value |
| 403 Forbidden | Missing/invalid `x-api-key` | Retrieve API key from `terraform output` |
| 500 Internal Error | Lambda execution failure | Check CloudWatch logs |
| Timeout | Request exceeded 5 minutes | Check job URL validity, network issues |
| Docker build fails | Dependency conflicts | Verify Python package versions in Dockerfile |

## Cleanup

To remove all resources:

```bash
cd terraform
terraform destroy -var="app_client_secret=YOUR_SECRET"

cd ../terraform_ecr
terraform destroy
```

**Note**: Manually delete any remaining ECR images and Secrets Manager secrets if needed.

## License

This project is for internal use. All rights reserved.

## Contributing

This is a proof-of-concept project. For questions or improvements, contact the development team.

## Support

For issues or questions:
- Check CloudWatch Logs for Lambda errors
- Review API Gateway execution logs
- Contact: swiri021@gmail.com