CREATE TYPE "public"."trust_level" AS ENUM('L0', 'L1', 'L2', 'L3', 'L4', 'L5');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'in_progress', 'verified', 'rejected', 'expired');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"domain" varchar,
	"industry" varchar,
	"trust_threshold" integer DEFAULT 500,
	"is_active" boolean DEFAULT true,
	"api_key" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "businesses_domain_unique" UNIQUE("domain"),
	CONSTRAINT "businesses_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "chitty_ids" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"chitty_id_code" varchar NOT NULL,
	"trust_score" integer DEFAULT 0,
	"trust_level" "trust_level" DEFAULT 'L0',
	"verification_status" "verification_status" DEFAULT 'pending',
	"issued_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chitty_ids_chitty_id_code_unique" UNIQUE("chitty_id_code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"chitty_id" varchar,
	"trust_score" integer DEFAULT 100,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_chitty_id_unique" UNIQUE("chitty_id")
);
--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"chitty_id" varchar,
	"request_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"trust_score_at_request" integer,
	"response_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chitty_id" varchar NOT NULL,
	"verification_type" varchar NOT NULL,
	"status" "verification_status" DEFAULT 'pending',
	"document_hash" varchar,
	"verified_at" timestamp,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chitty_ids" ADD CONSTRAINT "chitty_ids_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_chitty_id_chitty_ids_id_fk" FOREIGN KEY ("chitty_id") REFERENCES "public"."chitty_ids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_chitty_id_chitty_ids_id_fk" FOREIGN KEY ("chitty_id") REFERENCES "public"."chitty_ids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");