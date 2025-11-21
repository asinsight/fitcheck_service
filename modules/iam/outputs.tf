output "role_arn" {
  value       = aws_iam_role.lambda_role.arn
  description = "The ARN of the IAM role for Lambda"
}
