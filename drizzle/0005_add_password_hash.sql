ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(256);
ALTER TABLE `users` ADD UNIQUE INDEX `users_email_unique` (`email`);
