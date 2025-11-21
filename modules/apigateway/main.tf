resource "aws_apigatewayv2_api" "http_api" {
  name          = "fitcheck-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type", "x-api-key"]
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

# API Key for Scraper
resource "aws_apigatewayv2_api_key" "scraper_key" {
  name    = "fitcheck-scraper-key"
  enabled = true
}

# Usage Plan
resource "aws_apigatewayv2_usage_plan" "scraper_plan" {
  name        = "fitcheck-scraper-plan"
  description = "Usage plan for FitCheck scraper API"
  api_id      = aws_apigatewayv2_api.http_api.id

  quota_settings {
    limit  = 10000
    period = "MONTH"
  }

  throttle_settings {
    burst_limit = 100
    rate_limit  = 50
  }
}

# Link API Key to Usage Plan
resource "aws_apigatewayv2_usage_plan_key" "scraper_key_link" {
  key_id        = aws_apigatewayv2_api_key.scraper_key.id
  key_type      = "API_KEY"
  usage_plan_id = aws_apigatewayv2_usage_plan.scraper_plan.id
}

# Scraper Route (only scraper now, analyzer uses Function URL)
resource "aws_apigatewayv2_integration" "scraper_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.scraper_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "scraper_route" {
  api_id           = aws_apigatewayv2_api.http_api.id
  route_key        = "POST /scrape"
  target           = "integrations/${aws_apigatewayv2_integration.scraper_integration.id}"
  api_key_required = true
}

resource "aws_lambda_permission" "api_gw_scraper" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.scraper_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*/scrape"
}
