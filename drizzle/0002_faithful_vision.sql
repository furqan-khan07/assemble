CREATE TABLE `creditTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`credits` int NOT NULL,
	`reason` varchar(128) NOT NULL,
	`stripePaymentIntentId` varchar(256),
	`projectId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `manuals` ADD `fileSizeBytes` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projects` ADD `creditsCost` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `credits` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(128);