ALTER TABLE `users` ADD `emailVerified` boolean NOT NULL DEFAULT false;
ALTER TABLE `users` ADD `verificationToken` varchar(128);
ALTER TABLE `users` ADD CONSTRAINT `users_verificationToken_unique` UNIQUE(`verificationToken`);
