CREATE TABLE `minds_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`outcome` enum('success','failure','quota_blocked') NOT NULL,
	`durationMs` int NOT NULL,
	`retryCount` int NOT NULL DEFAULT 0,
	`platformCount` int NOT NULL,
	`errorCode` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `minds_events_id` PRIMARY KEY(`id`)
);
