-- Migration to add barcode support to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
