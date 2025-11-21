module "iam" {
  source = "../modules/iam"
}

output "lambda_role_arn" {
  value = module.iam.role_arn
}
