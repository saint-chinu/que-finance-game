CREATE TABLE `verified_operations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`revision` integer NOT NULL,
	`operation` text NOT NULL,
	`hash` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `verified_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operations_run_revision` ON `verified_operations` (`run_id`,`revision`);--> statement-breakpoint
CREATE TABLE `rankings` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`scenario` text NOT NULL,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`profitability` integer NOT NULL,
	`health` integer NOT NULL,
	`wealth` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rankings_actor_scenario` ON `rankings` (`actor`,`scenario`);--> statement-breakpoint
CREATE INDEX `rankings_scenario_score` ON `rankings` (`scenario`,`score`,`created`);--> statement-breakpoint
CREATE TABLE `verified_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`scenario` text NOT NULL,
	`engine` text NOT NULL,
	`seed` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`state` text NOT NULL,
	`last_hash` text,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `runs_actor_created` ON `verified_runs` (`actor`,`created`);