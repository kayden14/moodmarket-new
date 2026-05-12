/*
  # Fix Vendor Application Re-apply

  The vendor_applications table only had an UPDATE policy for admins.
  When a rejected applicant clicks "Apply Again" the upsert needs to be
  able to overwrite their own existing row.

  This migration adds a policy that lets a user update their own
  application row (so the upsert / re-apply flow works).
*/

DO $$ BEGIN
  CREATE POLICY "Users can update own application"
    ON vendor_applications FOR UPDATE
    TO authenticated
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
