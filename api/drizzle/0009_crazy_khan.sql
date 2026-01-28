ALTER TABLE `events` ADD `cancelReason` text;--> statement-breakpoint
ALTER TABLE `events` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `events` ADD `cancelledByOrganizerId` int;--> statement-breakpoint
ALTER TABLE `registrations` ADD `refundStatus` enum('none','pending','processing','completed','failed') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `registrations` ADD `refundTransactionId` varchar(100);--> statement-breakpoint
ALTER TABLE `registrations` ADD `refundedAt` timestamp;--> statement-breakpoint
ALTER TABLE `registrations` ADD `refundReason` text;