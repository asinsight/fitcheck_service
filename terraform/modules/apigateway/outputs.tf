output "api_endpoint" {
  value       = "https://${aws_api_gateway_rest_api.scraper_api.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${aws_api_gateway_stage.prod.stage_name}/scrape"
  description = "The endpoint of the API Gateway"
}

output "api_key_value" {
  value       = aws_api_gateway_api_key.scraper_key.value
  description = "The API Key for accessing the scraper endpoint"
  sensitive   = true
}

output "api_key_id" {
  value       = aws_api_gateway_api_key.scraper_key.id
  description = "The ID of the API Key"
}
