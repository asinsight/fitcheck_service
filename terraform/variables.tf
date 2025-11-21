variable "scraper_image_uri" {
  description = "Full ECR image URI (including tag) for the scraper Lambda"
  type        = string
}

variable "analyzer_image_uri" {
  description = "Full ECR image URI (including tag) for the analyzer Lambda"
  type        = string
}

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

variable "gemini_model_name" {
  description = "Gemini model name to use (e.g., gemini-2.5-flash)"
  type        = string
  default     = "gemini-2.5-flash"
}
