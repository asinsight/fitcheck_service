output "function_arn" {
  value       = aws_lambda_function.this.arn
  description = "The ARN of the Lambda function"
}

output "function_name" {
  value       = aws_lambda_function.this.function_name
  description = "The name of the Lambda function"
}

output "invoke_arn" {
  value       = aws_lambda_function.this.invoke_arn
  description = "The Invoke ARN of the Lambda function"
}

output "function_url" {
  description = "Lambda Function URL (if enabled)"
  value       = var.enable_function_url ? aws_lambda_function_url.this[0].function_url : null
}
