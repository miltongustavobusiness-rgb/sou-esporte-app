CREATE TABLE `event_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`distance` decimal(6,2),
	`minAge` int,
	`maxAge` int,
	`gender` enum('male','female','mixed') DEFAULT 'mixed',
	`price` decimal(10,2) NOT NULL,
	`earlyBirdPrice` decimal(10,2),
	`earlyBirdEndDate` timestamp,
	`maxParticipants` int,
	`currentParticipants` int DEFAULT 0,
	`startTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_kits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`items` json,
	`additionalPrice` decimal(10,2) DEFAULT '0',
	`sizes` json,
	`available` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_kits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`url` text NOT NULL,
	`thumbnailUrl` text,
	`caption` text,
	`photographer` varchar(100),
	`sortOrder` int DEFAULT 0,
	`featured` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`shortDescription` text,
	`eventDate` timestamp NOT NULL,
	`registrationStartDate` timestamp,
	`registrationEndDate` timestamp,
	`city` varchar(100) NOT NULL,
	`state` varchar(2) NOT NULL,
	`address` text,
	`startLocation` text,
	`finishLocation` text,
	`routeCoordinates` json,
	`mapCenter` json,
	`mapZoom` int DEFAULT 14,
	`bannerUrl` text,
	`logoUrl` text,
	`organizerId` int NOT NULL,
	`organizerName` varchar(255),
	`organizerContact` text,
	`status` enum('draft','published','cancelled','finished') NOT NULL DEFAULT 'draft',
	`featured` boolean DEFAULT false,
	`checkoutBaseUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`),
	CONSTRAINT `events_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventId` int NOT NULL,
	`categoryId` int NOT NULL,
	`kitId` int,
	`kitSize` varchar(10),
	`categoryPrice` decimal(10,2) NOT NULL,
	`kitPrice` decimal(10,2) DEFAULT '0',
	`totalPrice` decimal(10,2) NOT NULL,
	`checkoutToken` varchar(64) NOT NULL,
	`paymentStatus` enum('pending','paid','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`paymentDate` timestamp,
	`paymentMethod` varchar(50),
	`transactionId` varchar(100),
	`status` enum('pending','confirmed','cancelled','noshow') NOT NULL DEFAULT 'pending',
	`raceNumber` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `registrations_checkoutToken_unique` UNIQUE(`checkoutToken`)
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int NOT NULL,
	`userId` int NOT NULL,
	`eventId` int NOT NULL,
	`categoryId` int NOT NULL,
	`chipTime` int,
	`gunTime` int,
	`avgPace` int,
	`overallRank` int,
	`categoryRank` int,
	`genderRank` int,
	`splits` json,
	`certificateUrl` text,
	`certificateGenerated` boolean DEFAULT false,
	`status` enum('official','dnf','dq','dns') DEFAULT 'official',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `results_id` PRIMARY KEY(`id`),
	CONSTRAINT `results_registrationId_unique` UNIQUE(`registrationId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','organizer') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `cpf` varchar(14);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `birthDate` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `gender` enum('male','female','other');--> statement-breakpoint
ALTER TABLE `users` ADD `photoUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `street` text;--> statement-breakpoint
ALTER TABLE `users` ADD `number` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `complement` text;--> statement-breakpoint
ALTER TABLE `users` ADD `neighborhood` text;--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `state` varchar(2);--> statement-breakpoint
ALTER TABLE `users` ADD `zipCode` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `emergencyName` text;--> statement-breakpoint
ALTER TABLE `users` ADD `emergencyPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `bloodType` varchar(5);--> statement-breakpoint
ALTER TABLE `users` ADD `healthInfo` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totalRaces` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `totalDistance` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `users` ADD `bestTime5k` int;--> statement-breakpoint
ALTER TABLE `users` ADD `bestTime10k` int;--> statement-breakpoint
ALTER TABLE `users` ADD `bestTime21k` int;--> statement-breakpoint
ALTER TABLE `users` ADD `bestTime42k` int;