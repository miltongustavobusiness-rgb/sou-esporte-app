-- Migration: Add profile_status and billing_status for Apple/Google compliance
-- Date: 2026-01-22
-- Description: Adds fields to support simplified onboarding without CPF/address

-- Add profile_status column
ALTER TABLE users ADD COLUMN profileStatus ENUM('INCOMPLETE', 'BASIC_COMPLETE') DEFAULT 'INCOMPLETE';

-- Add billing_status column  
ALTER TABLE users ADD COLUMN billingStatus ENUM('INCOMPLETE', 'COMPLETE') DEFAULT 'INCOMPLETE';

-- Update gender enum to include 'prefiro_nao_informar'
ALTER TABLE users MODIFY COLUMN gender ENUM('male', 'female', 'other', 'prefiro_nao_informar');

-- Set existing users with complete profiles to BASIC_COMPLETE
UPDATE users SET profileStatus = 'BASIC_COMPLETE' WHERE name IS NOT NULL AND birthDate IS NOT NULL AND photoUrl IS NOT NULL;

-- Set existing users with CPF to billing COMPLETE
UPDATE users SET billingStatus = 'COMPLETE' WHERE cpf IS NOT NULL AND cpf != '';
