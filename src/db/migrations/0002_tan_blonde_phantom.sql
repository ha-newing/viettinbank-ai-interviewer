CREATE TABLE `assessment_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role_code` text NOT NULL,
	`role_name` text NOT NULL,
	`speaker_label` text,
	`interview_token` text,
	`tbei_status` text DEFAULT 'pending' NOT NULL,
	`hipo_status` text DEFAULT 'pending' NOT NULL,
	`quiz_status` text DEFAULT 'pending' NOT NULL,
	`email_sent_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `assessment_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `assessment_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`organization_id` text NOT NULL,
	`job_template_id` text,
	`status` text DEFAULT 'created' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_template_id`) REFERENCES `job_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `case_study_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`transcript_id` text NOT NULL,
	`competency_id` text NOT NULL,
	`score` integer,
	`level` text,
	`rationale` text,
	`evidence` text,
	`evidence_strength` text DEFAULT 'insufficient' NOT NULL,
	`count_toward_overall` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `assessment_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `assessment_participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transcript_id`) REFERENCES `case_study_transcripts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `case_study_transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`raw_transcript` text NOT NULL,
	`consolidated_transcript` text NOT NULL,
	`speaker_mapping` text,
	`duration_seconds` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `assessment_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `hipo_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`ability_score` integer,
	`aspiration_score` integer,
	`engagement_score` integer,
	`integrated_score` integer,
	`total_score` integer,
	`responses` text,
	`open_response1` text,
	`open_response2` text,
	`ability_classification` text,
	`aspiration_classification` text,
	`engagement_classification` text,
	`integrated_classification` text,
	`completed_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `assessment_participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quiz_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`answers` text,
	`score` integer,
	`total_questions` integer,
	`time_spent_seconds` integer,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `assessment_participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tbei_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`competency_id` text NOT NULL,
	`question_id` text NOT NULL,
	`selected_question_index` integer,
	`transcript` text NOT NULL,
	`audio_url` text,
	`duration_seconds` integer,
	`evaluation` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `assessment_participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_participants_interview_token_unique` ON `assessment_participants` (`interview_token`);