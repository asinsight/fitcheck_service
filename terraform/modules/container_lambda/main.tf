resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = var.role_arn
  package_type  = "Image"
  image_uri     = var.image_uri
  timeout       = var.timeout

  environment {
    variables = var.environment_variables
  }
}

# Lambda Function URL (optional)
resource "aws_lambda_function_url" "this" {
  count              = var.enable_function_url ? 1 : 0
  function_name      = aws_lambda_function.this.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = true
    allow_origins     = var.allowed_origins
    allow_methods     = var.allowed_methods
    allow_headers     = ["Content-Type", "x-fitcheck-auth"]
    max_age           = 86400
  }
}
