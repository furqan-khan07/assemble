CREATE TABLE `manuals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`filename` varchar(512) NOT NULL,
	`s3Key` varchar(512) NOT NULL,
	`s3Url` text,
	`pageCount` int DEFAULT 0,
	`isImageOnly` boolean DEFAULT false,
	`extractedTextPath` text,
	`chromaCollectionId` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manuals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`status` enum('new','processing','ready','failed') NOT NULL DEFAULT 'new',
	`totalSteps` int DEFAULT 0,
	`currentStep` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stepSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`currentStep` int NOT NULL DEFAULT 1,
	`totalSteps` int NOT NULL DEFAULT 0,
	`stepsData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stepSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `freeManualUsed` boolean DEFAULT false NOT NULL;