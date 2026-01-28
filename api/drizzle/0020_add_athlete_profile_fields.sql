-- Add athlete profile fields to users table
ALTER TABLE `users` ADD COLUMN `athleteCategory` enum('profissional','amador','instrutor') DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `sports` text DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `country` varchar(100) DEFAULT NULL;
