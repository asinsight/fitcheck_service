# LinkedIn Scraper Lambda

This Lambda function provides a unified interface to scrape various LinkedIn data points using BrightData.

## Usage

The Lambda expects an HTTP request (via API Gateway) or direct invocation.

### API Gateway Request

**Method:** `POST` (or `GET` with body if supported, but POST is recommended for sending JSON bodies)
**Query Parameter:** `type` (Required) - The type of scraping to perform.
**Body:** JSON array of input objects.

#### Supported Types

1.  **`jobs_by_url`**
    *   **Input:** `[{"url": "https://www.linkedin.com/jobs/view/..."}]`
    *   **Description:** Scrape job details from a specific job URL.

2.  **`profile_by_url`**
    *   **Input:** `[{"url": "https://www.linkedin.com/in/..."}]`
    *   **Description:** Scrape profile details from a profile URL.

3.  **`company_by_url`**
    *   **Input:** `[{"url": "https://www.linkedin.com/company/..."}]`
    *   **Description:** Scrape company details.

4.  **`posts_discover_by_url`**
    *   **Input:** `[{"url": "https://www.linkedin.com/today/author/..."}]`
    *   **Description:** Discover posts by an author URL.

5.  **`profile_by_name`**
    *   **Input:** `[{"first_name": "John", "last_name": "Doe"}]`
    *   **Description:** Discover profiles by name.

### Example Request (cURL)

```bash
curl -X POST "https://<api-id>.execute-api.us-east-1.amazonaws.com/scrape?type=jobs_by_url" \
     -H "Content-Type: application/json" \
     -d '[{"url": "https://www.linkedin.com/jobs/view/1234567890"}]'
```

## Environment Variables

*   `BRIGHTDATA_SECRET_NAME`: The name of the secret in AWS Secrets Manager containing the BrightData API key (key: `api_key`).
