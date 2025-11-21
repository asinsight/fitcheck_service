provider "aws" {
  region  = "us-east-1"
  profile = "swiri021"
}

module "scraper_lambda" {
  source        = "./modules/container_lambda"
  function_name = "fitcheck-scraper"
  role_arn      = module.iam.role_arn
  image_uri     = var.scraper_image_uri
  timeout       = 30
  environment_variables = {
    BRIGHTDATA_SECRET_NAME = "brightdata-api-key"
  }
  enable_function_url = false
}

module "analyzer_lambda" {
  source        = "./modules/container_lambda"
  function_name = "fitcheck-analyzer"
  role_arn      = module.iam.role_arn
  image_uri     = var.analyzer_image_uri
  timeout       = 300 # 5 minutes
  environment_variables = {
    GEMINI_SECRET_NAME = "gemini-key"
    APP_CLIENT_SECRET  = var.app_client_secret
  }
  enable_function_url = true
  allowed_origins     = var.allowed_origins
}
