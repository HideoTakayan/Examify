-- First-login flag: force password change after admin reset or new account
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS first_login BOOLEAN NOT NULL DEFAULT false;

UPDATE accounts SET first_login = false WHERE first_login IS DISTINCT FROM false;
