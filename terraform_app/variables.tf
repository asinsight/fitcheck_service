variable "app_client_secret" {
  description = "Application client secret for Lambda authentication"
  type        = string
  sensitive   = true
  default     = "change-this-secret-in-production"
}

variable "allowed_origins" {
  description = "List of allowed origins for analyzer Function URL CORS"
  type        = list(string)
  default     = ["*"]
}
