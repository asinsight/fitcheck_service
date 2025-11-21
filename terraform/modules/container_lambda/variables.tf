variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "image_uri" {
  description = "URI of the container image"
  type        = string
}

variable "role_arn" {
  description = "IAM Role ARN for the Lambda function"
  type        = string
}

variable "timeout" {
  description = "Timeout for the Lambda function in seconds"
  type        = number
  default     = 30
}

variable "environment_variables" {
  description = "Map of environment variables"
  type        = map(string)
  default     = {}
}

variable "enable_function_url" {
  description = "Enable Lambda Function URL"
  type        = bool
  default     = false
}

variable "allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "allowed_methods" {
  description = "List of allowed HTTP methods for the Lambda Function URL CORS configuration"
  type        = list(string)
  default     = ["POST"]
}
