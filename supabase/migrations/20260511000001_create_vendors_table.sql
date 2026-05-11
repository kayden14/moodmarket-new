/*
  # Create Vendors Table and Update Applications

  1. New Tables
    - `vendors`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `store_name` (text)
      - `store_description` (text)
      - `store_logo` (text)
      - `contact_email` (text)
      - `contact_phone` (text)
      - `is_suspended` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `email` to `vendor_applications`
    - Add RLS and policies for `vendors` table
    - Migrate data from `profiles` to `vendors`
*/

-- 1. Update vendor_applications
ALTER TABLE vendor_applications ADD COLUMN IF NOT EXISTS email text;

-- 2. Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_name        text    NOT NULL,
  store_description text,
  store_logo        text,
  contact_email     text,
  contact_phone     text,
  is_suspended      boolean NOT NULL DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- 3. Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DO $$ BEGIN
  CREATE POLICY "Vendors can view own record"
    ON vendors FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage vendors"
    ON vendors FOR ALL
    TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Migrate existing vendors
INSERT INTO vendors (user_id, store_name, store_description, store_logo, contact_phone, is_suspended)
SELECT id, store_name, store_description, store_logo, phone, is_suspended
FROM profiles
WHERE role = 'vendor'
ON CONFLICT (user_id) DO NOTHING;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
