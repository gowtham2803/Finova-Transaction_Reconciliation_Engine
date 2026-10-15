-- V5: Add reconciliation_name to reconciliations table and enforce uniqueness

ALTER TABLE reconciliations ADD COLUMN reconciliation_name VARCHAR(150) NULL AFTER reconciliation_code;

-- Set default unique names for all existing reconciliations
UPDATE reconciliations SET reconciliation_name = CONCAT('Reconciliation ', id) WHERE reconciliation_name IS NULL;

-- Populate known display names
UPDATE reconciliations SET reconciliation_name = 'October Branch Reconciliation' WHERE id = 1;
UPDATE reconciliations SET reconciliation_name = 'September Settlement Reconciliation' WHERE id = 2;
UPDATE reconciliations SET reconciliation_name = 'South Region Transfer Reconciliation' WHERE id = 3;
UPDATE reconciliations SET reconciliation_name = 'Chennai Central Node Liquidity Check' WHERE id = 4;
UPDATE reconciliations SET reconciliation_name = 'Coimbatore Industrial Corridor Clearing' WHERE id = 5;
UPDATE reconciliations SET reconciliation_name = 'Madurai Temple City Daily Settlement' WHERE id = 6;
UPDATE reconciliations SET reconciliation_name = 'Trichy Delta Region Agri-Fund Clearing' WHERE id = 7;
UPDATE reconciliations SET reconciliation_name = 'Salem Steel City Bulk Clearing' WHERE id = 8;
UPDATE reconciliations SET reconciliation_name = 'Q3 Inter-Branch Intermediary Audit' WHERE id = 9;
UPDATE reconciliations SET reconciliation_name = 'Weekend Clearing Batch - South Zone' WHERE id = 10;
UPDATE reconciliations SET reconciliation_name = 'Pre-Holiday Express Liquidity Pass' WHERE id = 11;
UPDATE reconciliations SET reconciliation_name = 'Merchant Surcharge Settlement Audit' WHERE id = 12;
UPDATE reconciliations SET reconciliation_name = 'Try 7' WHERE id = 18;
UPDATE reconciliations SET reconciliation_name = 'Try 11' WHERE id = 20;
UPDATE reconciliations SET reconciliation_name = 'trynew' WHERE id = 21;

-- Clean up orphaned aborted imports from earlier testing (recs 22-27 and 29-34 had 0 transactions)
DELETE FROM audit_logs WHERE reconciliation_id IN (22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34);
DELETE FROM reconciliations WHERE id IN (22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34);

-- Enforce NOT NULL and case-insensitive UNIQUE constraint
ALTER TABLE reconciliations MODIFY reconciliation_name VARCHAR(150) NOT NULL;
ALTER TABLE reconciliations ADD CONSTRAINT uk_reconciliations_name UNIQUE (reconciliation_name);
