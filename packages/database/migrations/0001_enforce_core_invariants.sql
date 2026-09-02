PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_columns` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`status_type` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`wip_limit` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `columns_status_type_check` CHECK (`status_type` IN ('inbox', 'ready', 'in_progress', 'blocked', 'done')),
	CONSTRAINT `columns_position_check` CHECK (`position` >= 0),
	CONSTRAINT `columns_wip_limit_check` CHECK (`wip_limit` IS NULL OR `wip_limit` >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_columns` (`id`, `board_id`, `status_type`, `name`, `position`, `wip_limit`, `version`, `created_at`, `updated_at`)
SELECT `id`, `board_id`, `status_type`, `name`, `position`, `wip_limit`, `version`, `created_at`, `updated_at`
FROM `columns`;
--> statement-breakpoint
DROP TABLE `columns`;
--> statement-breakpoint
ALTER TABLE `__new_columns` RENAME TO `columns`;
--> statement-breakpoint
CREATE UNIQUE INDEX `columns_board_status_unique` ON `columns` (`board_id`,`status_type`);
--> statement-breakpoint
CREATE INDEX `columns_board_idx` ON `columns` (`board_id`);
--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`column_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`task_type` text DEFAULT 'general' NOT NULL,
	`position` integer NOT NULL,
	`due_date` integer,
	`is_focus` integer DEFAULT false NOT NULL,
	`notes` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	`archived_at` integer,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`column_id`) REFERENCES `columns`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `tasks_priority_check` CHECK (`priority` IN ('low', 'medium', 'high', 'urgent')),
	CONSTRAINT `tasks_task_type_check` CHECK (`task_type` IN ('general', 'test_design', 'test_execution', 'exploratory', 'bug_investigation', 'bug_verification', 'test_automation', 'regression', 'documentation')),
	CONSTRAINT `tasks_position_check` CHECK (`position` >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_tasks` (`id`, `board_id`, `column_id`, `title`, `description`, `priority`, `task_type`, `position`, `due_date`, `is_focus`, `notes`, `version`, `created_at`, `updated_at`, `completed_at`, `archived_at`)
SELECT `id`, `board_id`, `column_id`, `title`, `description`, `priority`, `task_type`, `position`, `due_date`, `is_focus`, `notes`, `version`, `created_at`, `updated_at`, `completed_at`, `archived_at`
FROM `tasks`;
--> statement-breakpoint
DROP TABLE `tasks`;
--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_column_position_unique` ON `tasks` (`column_id`,`position`);
--> statement-breakpoint
CREATE INDEX `tasks_board_idx` ON `tasks` (`board_id`);
--> statement-breakpoint
CREATE INDEX `tasks_column_idx` ON `tasks` (`column_id`);
--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `tasks` (`due_date`);
--> statement-breakpoint
CREATE INDEX `tasks_completed_idx` ON `tasks` (`completed_at`);
--> statement-breakpoint
CREATE INDEX `tasks_focus_idx` ON `tasks` (`board_id`,`is_focus`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
