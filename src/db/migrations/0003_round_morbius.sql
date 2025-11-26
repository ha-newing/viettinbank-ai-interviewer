CREATE TABLE `case_study_transcript_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`version` integer NOT NULL,
	`full_transcript` text NOT NULL,
	`speaker_mapping` text,
	`total_duration_seconds` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `assessment_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
