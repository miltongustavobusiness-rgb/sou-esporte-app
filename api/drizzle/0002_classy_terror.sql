CREATE TABLE `team_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`email` varchar(320),
	`userId` int,
	`invitedBy` int NOT NULL,
	`role` enum('admin','member') NOT NULL DEFAULT 'member',
	`token` varchar(64) NOT NULL,
	`status` enum('pending','accepted','rejected','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`status` enum('pending','active','inactive') NOT NULL DEFAULT 'pending',
	`nickname` varchar(100),
	`jerseyNumber` varchar(10),
	`joinedAt` timestamp,
	`invitedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`logoUrl` text,
	`bannerUrl` text,
	`primaryColor` varchar(7),
	`email` varchar(320),
	`phone` varchar(20),
	`website` text,
	`city` varchar(100),
	`state` varchar(2),
	`isPublic` boolean DEFAULT true,
	`allowJoinRequests` boolean DEFAULT true,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `registrations` ADD `teamId` int;--> statement-breakpoint
ALTER TABLE `registrations` ADD `registeredBy` int;