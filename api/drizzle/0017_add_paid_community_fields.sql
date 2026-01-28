-- Migration: Add paid community and instructor fields to teams table
-- Version: 0017
-- Date: 2026-01-22

-- Add group type field (free or paid)
ALTER TABLE teams ADD COLUMN groupType ENUM('gratuito', 'pago') NOT NULL DEFAULT 'gratuito' AFTER ownerId;

-- Add paid community pricing fields
ALTER TABLE teams ADD COLUMN monthlyPrice DECIMAL(10, 2) DEFAULT 0 AFTER groupType;
ALTER TABLE teams ADD COLUMN billingPeriod ENUM('mensal', 'trimestral', 'semestral', 'anual') DEFAULT 'mensal' AFTER monthlyPrice;
ALTER TABLE teams ADD COLUMN communityBenefits TEXT AFTER billingPeriod;

-- Add instructor fields
ALTER TABLE teams ADD COLUMN instructorName VARCHAR(255) AFTER communityBenefits;
ALTER TABLE teams ADD COLUMN instructorSpecialty VARCHAR(255) AFTER instructorName;
ALTER TABLE teams ADD COLUMN instructorBio TEXT AFTER instructorSpecialty;
ALTER TABLE teams ADD COLUMN instructorPhotoUrl TEXT AFTER instructorBio;

-- Add modality and preferences fields
ALTER TABLE teams ADD COLUMN modality ENUM('corrida', 'triathlon', 'bike', 'natacao', 'funcional', 'outro') DEFAULT 'corrida' AFTER instructorPhotoUrl;
ALTER TABLE teams ADD COLUMN preferredDistances JSON AFTER modality;
ALTER TABLE teams ADD COLUMN rules TEXT AFTER preferredDistances;
ALTER TABLE teams ADD COLUMN allowPublicTrainings BOOLEAN DEFAULT TRUE AFTER rules;
ALTER TABLE teams ADD COLUMN requireMemberApproval BOOLEAN DEFAULT FALSE AFTER allowPublicTrainings;

-- Create index for group type queries
CREATE INDEX idx_teams_groupType ON teams(groupType);
CREATE INDEX idx_teams_modality ON teams(modality);
