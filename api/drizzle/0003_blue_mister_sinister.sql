CREATE TABLE `checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`checkedInBy` int NOT NULL,
	`method` enum('qrcode','manual','raceNumber') NOT NULL,
	`kitDelivered` boolean DEFAULT false,
	`kitDeliveredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('registration','payment','event','result','team','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`eventId` int,
	`registrationId` int,
	`teamId` int,
	`read` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`actionUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
