module "apigateway" {
  source                = "../modules/apigateway"
  scraper_invoke_arn    = module.scraper_lambda.invoke_arn
  scraper_function_name = module.scraper_lambda.function_name
}

output "api_endpoint" {
  value       = module.apigateway.api_endpoint
  description = "API Gateway endpoint for scraper"
}

output "scraper_api_key" {
  value       = module.apigateway.api_key_value
  description = "API Key for scraper endpoint"
  sensitive   = true
}

output "analyzer_function_url" {
  value       = module.analyzer_lambda.function_url
  description = "Lambda Function URL for analyzer (use with x-fitcheck-auth header)"
}
