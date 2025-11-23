data "aws_region" "current" {}

resource "aws_api_gateway_rest_api" "scraper_api" {
  name = "fitcheck-scraper-api"
}

resource "aws_api_gateway_resource" "scrape" {
  rest_api_id = aws_api_gateway_rest_api.scraper_api.id
  parent_id   = aws_api_gateway_rest_api.scraper_api.root_resource_id
  path_part   = "scrape"
}

resource "aws_api_gateway_method" "post_scrape" {
  rest_api_id   = aws_api_gateway_rest_api.scraper_api.id
  resource_id   = aws_api_gateway_resource.scrape.id
  http_method   = "POST"
  authorization = "NONE"

  api_key_required = true
}

resource "aws_api_gateway_integration" "scrape_integration" {
  rest_api_id             = aws_api_gateway_rest_api.scraper_api.id
  resource_id             = aws_api_gateway_resource.scrape.id
  http_method             = aws_api_gateway_method.post_scrape.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.scraper_invoke_arn
}

resource "aws_api_gateway_deployment" "scraper_deployment" {
  rest_api_id = aws_api_gateway_rest_api.scraper_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.scrape_integration.id,
      aws_api_gateway_method.post_scrape.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [aws_api_gateway_integration.scrape_integration]
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.scraper_api.id
  deployment_id = aws_api_gateway_deployment.scraper_deployment.id
  stage_name    = "prod"
}

resource "aws_api_gateway_usage_plan" "scraper_plan" {
  name = "fitcheck-scraper-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.scraper_api.id
    stage  = aws_api_gateway_stage.prod.stage_name
  }

  quota_settings {
    limit  = 10000
    period = "MONTH"
  }

  throttle_settings {
    burst_limit = 100
    rate_limit  = 50
  }
}

resource "aws_api_gateway_api_key" "scraper_key" {
  name    = "fitcheck-scraper-key"
  enabled = true
}

resource "aws_api_gateway_usage_plan_key" "scraper_plan_key" {
  key_id        = aws_api_gateway_api_key.scraper_key.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.scraper_plan.id
}

resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.scraper_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.scraper_api.execution_arn}/*/POST/scrape"
}
