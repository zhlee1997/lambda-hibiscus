-- # Sample Create Statement
CREATE TABLE stripe_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL,         -- Stripe Event ID (e.g., evt_*)
  invoice_id VARCHAR(255) NOT NULL,       -- Invoice ID (e.g., in_*)
  subscription_id VARCHAR(255),           -- Related subscription (if available)
  customer_id VARCHAR(255),               -- Stripe Customer ID
  amount_paid INT,                        -- In cents (e.g., 1500 = $15.00)
  currency VARCHAR(10),                   -- Currency (e.g., usd)
  status VARCHAR(20),                     -- Invoice status (e.g., paid, draft)
  created_at TIMESTAMP,                   -- Stripe invoice creation timestamp
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- # Sample Insert Statement
INSERT INTO stripe_invoices
  (event_id, invoice_id, subscription_id, customer_id, amount_paid, currency, status, created_at)
VALUES
  (
    'evt_1RQ2a12esPqFiBdr0OsRiHhW',                    -- event_id
    'in_1RQ2Zy2esPqFiBdrwEUHrGFF',                     -- invoice_id
    'sub_1RQ2Zy2esPqFiBdrfXVcepSf',                    -- subscription_id
    'cus_SKhz0ujZP5aP29',                              -- customer_id
    1500,                                              -- amount_paid (in cents)
    'usd',                                             -- currency
    'paid',                                            -- status
    FROM_UNIXTIME(1747556898)                          -- created_at
  );