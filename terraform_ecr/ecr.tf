provider "aws" {
  region  = "us-east-1"
  profile = "swiri021"
}

module "scraper_repo" {
  source    = "./modules/ecr_repo"
  repo_name = "fitcheck-scraper-repo"
}

module "analyzer_repo" {
  source    = "./modules/ecr_repo"
  repo_name = "fitcheck-analyzer-repo"
}

output "scraper_repo_url" {
  value = module.scraper_repo.repository_url
}

output "analyzer_repo_url" {
  value = module.analyzer_repo.repository_url
}
