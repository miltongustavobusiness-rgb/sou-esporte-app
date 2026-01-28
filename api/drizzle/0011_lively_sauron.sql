CREATE TABLE `event_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_likes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int,
	`platform` enum('whatsapp','instagram','facebook','twitter','copy_link','other') DEFAULT 'other',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_shares_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `events` ADD `likesCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `sharesCount` int DEFAULT 0 NOT NULL;