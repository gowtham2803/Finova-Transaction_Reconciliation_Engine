-- ============================================================
-- V7: Add Additional Branches (BTB - SUSPENSE, BT - SUSPENSEONE)
-- ============================================================

INSERT INTO branches (id, code, name, active, created_at, updated_at) VALUES
(35, 'BTB', 'SUSPENSE', TRUE, NOW(), NOW()),
(36, 'BT', 'SUSPENSEONE', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    code = VALUES(code),
    name = VALUES(name),
    active = VALUES(active),
    updated_at = NOW();
