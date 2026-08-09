CREATE TABLE IF NOT EXISTS refund_requests (
  id BIGSERIAL PRIMARY KEY,
  order_type VARCHAR(32) NOT NULL CHECK (order_type IN ('consult', 'lawyer_application', 'lawyer_renewal')),
  order_id VARCHAR(64) NOT NULL,
  order_no VARCHAR(64),
  user_id VARCHAR(64) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'rejected')),
  reviewer_id VARCHAR(64),
  review_note TEXT,
  wechat_refund_no VARCHAR(64),
  wechat_refund_id VARCHAR(64),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_requests_one_active
  ON refund_requests (order_type, order_id)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests (status, created_at DESC);
