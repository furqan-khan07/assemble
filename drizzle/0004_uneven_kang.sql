CREATE TABLE `stepFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`stepNumber` int NOT NULL,
	`stepTitle` varchar(512),
	`sourcePages` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stepFeedback_id` PRIMARY KEY(`id`)
);
