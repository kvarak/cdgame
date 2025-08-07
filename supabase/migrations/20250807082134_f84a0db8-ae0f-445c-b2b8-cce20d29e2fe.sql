-- Enable leaked password protection (security best practice)
UPDATE auth.config 
SET leaked_password_protection = true;