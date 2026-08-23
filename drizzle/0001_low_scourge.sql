CREATE TABLE `minds_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`usageDate` varchar(10) NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `minds_usage_id` PRIMARY KEY(`id`),
	CONSTRAINT `minds_usage_user_date_unique` UNIQUE(`userId`,`usageDate`)
);
