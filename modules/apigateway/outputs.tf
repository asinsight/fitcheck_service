output "api_endpoint" {
  value       = aws_apigatewayv2_api.http_api.api_endpoint
  description = "The endpoint of the API Gateway"
}

output "api_key_value" {
  value       = aws_apigatewayv2_api_key.scraper_key.value
  description = "The API Key for accessing the scraper endpoint"
  sensitive   = true
}

output "api_key_id" {
  value       = aws_apigatewayv2_api_key.scraper_key.id
  description = "The ID of the API Key"
}
