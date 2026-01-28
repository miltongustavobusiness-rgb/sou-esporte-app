ALTER TABLE `events` ADD `eventStartAt` timestamp;--> statement-breakpoint
ALTER TABLE `events` ADD `eventTimezone` varchar(50) DEFAULT 'America/Sao_Paulo';