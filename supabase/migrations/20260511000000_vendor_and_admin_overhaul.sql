/*
  # MoodMarket — Vendor & Admin Overhaul

  Changes:
  1. Extend `profiles` with role, store info, suspension flag, phone
  2. Extend `products` with vendor_id, stock_count, is_active, category
  3. Extend `orders` with vendor_id, updated_at
  4. New tables: vendor_applications, vendor_payouts, vendor_notifications
  5. New RLS policies for all new surfaces
  6. Indexes for performance
*/

-- ─────────────────────────────────────────────────────────────────────────
-- 1. EXTEND PROFILES
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role          text    NOT NULL DEFAULT 'customer'
                                         CHECK (role IN ('customer', 'vendor', 'admin')),
  ADD COLUMN IF NOT EXISTS store_name    text,
  ADD COLUMN IF NOT EXISTS store_description text,
  ADD COLUMN IF NOT EXISTS store_logo    text,
  ADD COLUMN IF NOT EXISTS phone         text,
  ADD COLUMN IF NOT EXISTS is_suspended  boolean NOT NULL DEFAULT false;

-- Sync existing admins into new role field
UPDATE profiles SET role = 'admin' WHERE is_admin = true;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. EXTEND PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vendor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stock_count  integer NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  ADD COLUMN IF NOT EXISTS is_active    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS category     text;

-- Vendors can only CRUD their own products
CREATE POLICY "Vendors can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('vendor', 'admin')
    AND (vendor_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  );

CREATE POLICY "Vendors can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    vendor_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    vendor_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Vendors can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (
    vendor_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins can manage any product
CREATE POLICY "Admins can insert any product"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 3. EXTEND ORDERS
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS vendor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- Vendors can view orders that belong to them
CREATE POLICY "Vendors can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR vendor_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins can update any order
CREATE POLICY "Admins can update any order"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR vendor_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 4. VENDOR APPLICATIONS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_applications (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_name        text    NOT NULL,
  store_description text,
  phone             text,
  status            text    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note        text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE vendor_applications ENABLE ROW LEVEL SECURITY;

-- Users can submit and read their own application
CREATE POLICY "Users can insert own application"
  ON vendor_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own application"
  ON vendor_applications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins can update applications (approve/reject)
CREATE POLICY "Admins can update applications"
  ON vendor_applications FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ─────────────────────────────────────────────────────────────────────────
-- 5. VENDOR PAYOUTS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_payouts (
  id                       uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id                uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount                   numeric NOT NULL CHECK (amount > 0),
  currency                 text    NOT NULL DEFAULT 'GHS',
  period_start             timestamptz NOT NULL,
  period_end               timestamptz NOT NULL,
  status                   text    NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  -- Paystack integration fields
  paystack_recipient_code  text,   -- vendor's Paystack recipient code
  paystack_transfer_code   text,   -- returned by Paystack on transfer initiation
  paystack_reference       text,   -- unique reference we generate per transfer
  payment_method           text,   -- 'bank' | 'momo'
  account_name             text,
  account_number           text,
  bank_code                text,
  -- Admin
  admin_note               text,
  initiated_by             uuid REFERENCES profiles(id),
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

ALTER TABLE vendor_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own payouts"
  ON vendor_payouts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = vendor_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Vendors can request payouts"
  ON vendor_payouts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = vendor_id
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'vendor'
  );

CREATE POLICY "Admins can update payouts"
  ON vendor_payouts FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can insert payouts"
  ON vendor_payouts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'vendor'));

-- ─────────────────────────────────────────────────────────────────────────
-- 6. VENDOR NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_notifications (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      text    NOT NULL,
  body       text    NOT NULL,
  type       text    NOT NULL DEFAULT 'info'
             CHECK (type IN ('info', 'order', 'payout', 'warning', 'approval')),
  is_read    boolean NOT NULL DEFAULT false,
  meta       jsonb   DEFAULT '{}'::jsonb,  -- optional extra data (order_id, payout_id, etc.)
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own notifications"
  ON vendor_notifications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = vendor_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Vendors can mark own notifications read"
  ON vendor_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Admins and system can insert notifications"
  ON vendor_notifications FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ─────────────────────────────────────────────────────────────────────────
-- 7. INDEXES
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_vendor_id        ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active        ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id          ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at         ON orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_user  ON vendor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_status ON vendor_applications(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor     ON vendor_payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status     ON vendor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_vendor ON vendor_notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_read ON vendor_notifications(vendor_id, is_read);
CREATE INDEX IF NOT EXISTS idx_profiles_role             ON profiles(role);
