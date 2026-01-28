ALTER TABLE `event_categories` ADD `isPaid` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `isPaidEvent` boolean DEFAULT true NOT NULL;