CREATE TABLE `event_rankings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`score` decimal(15,4) NOT NULL DEFAULT '0',
	`registrationCount` int DEFAULT 0,
	`viewCount` int DEFAULT 0,
	`likeCount` int DEFAULT 0,
	`shareCount` int DEFAULT 0,
	`favoriteCount` int DEFAULT 0,
	`daysUntilEvent` int,
	`hoursUntilEvent` int,
	`rankPosition` int,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_rankings_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_rankings_eventId_unique` UNIQUE(`eventId`)
);
