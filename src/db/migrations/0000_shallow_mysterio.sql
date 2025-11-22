CREATE TABLE `candidate_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`status` text DEFAULT 'all' NOT NULL,
	`updated_by` text NOT NULL,
	`notes` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `interviews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`organization_id` text,
	`is_new_organization` integer DEFAULT false NOT NULL,
	`expires_at` integer NOT NULL,
	`verified_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `interview_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`job_template_id` text,
	`question_text` text NOT NULL,
	`question_text_en` text,
	`question_order` integer NOT NULL,
	`time_limit` integer DEFAULT 120 NOT NULL,
	`category` text,
	`is_required` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_template_id`) REFERENCES `job_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `interview_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`question_id` text,
	`question_order` integer NOT NULL,
	`response_video_url` text,
	`response_transcript` text,
	`response_duration` integer,
	`response_scores` text,
	`attempt_number` integer DEFAULT 1 NOT NULL,
	`recording_started_at` integer,
	`recording_ended_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `interviews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `interview_questions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `interviews` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`job_template_id` text,
	`candidate_email` text NOT NULL,
	`candidate_name` text NOT NULL,
	`candidate_phone` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`interview_link_token` text NOT NULL,
	`interview_link_expires_at` integer NOT NULL,
	`overall_score` integer,
	`recommendation` text,
	`ai_scores` text,
	`transcript` text,
	`processing_started_at` integer,
	`processing_completed_at` integer,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_template_id`) REFERENCES `job_templates`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`interview_duration` integer DEFAULT 15 NOT NULL,
	`impression_weight` integer DEFAULT 20 NOT NULL,
	`task_performance_weight` integer DEFAULT 25 NOT NULL,
	`logical_thinking_weight` integer DEFAULT 20 NOT NULL,
	`research_ability_weight` integer DEFAULT 15 NOT NULL,
	`communication_weight` integer DEFAULT 20 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`name` text NOT NULL,
	`package_tier` text DEFAULT 'startup' NOT NULL,
	`interview_quota` integer DEFAULT 100 NOT NULL,
	`interviews_used` integer DEFAULT 0 NOT NULL,
	`subscription_expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`organization_id` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verifications_token_unique` ON `email_verifications` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `interviews_interview_link_token_unique` ON `interviews` (`interview_link_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_domain_unique` ON `organizations` (`domain`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_sessions_session_token_unique` ON `user_sessions` (`session_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);