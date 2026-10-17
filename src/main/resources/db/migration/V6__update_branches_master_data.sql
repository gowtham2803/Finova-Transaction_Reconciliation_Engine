-- ============================================================
-- V6: Replace Branches with New 34 Master Branches
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM branches;
ALTER TABLE branches AUTO_INCREMENT = 1;

INSERT INTO branches (id, code, name, active, created_at, updated_at) VALUES
(1, 'PY', 'PONDICHERRY', TRUE, NOW(), NOW()),
(2, 'TML', 'THIRUVANNAMALAI', TRUE, NOW(), NOW()),
(3, 'VLR', 'VELLORE', TRUE, NOW(), NOW()),
(4, 'MRD', 'MOUNT ROAD', TRUE, NOW(), NOW()),
(5, 'KOY', 'KOYAMBEDU', TRUE, NOW(), NOW()),
(6, 'TPT', 'PARRYS', TRUE, NOW(), NOW()),
(7, 'POR', 'PORUR', TRUE, NOW(), NOW()),
(8, 'KPM', 'KANCHIPURAM', TRUE, NOW(), NOW()),
(9, 'TAM', 'TAMBARAM', TRUE, NOW(), NOW()),
(10, 'MTP', 'METTUPALAYAM', TRUE, NOW(), NOW()),
(11, 'CBE', 'COIMBATORE', TRUE, NOW(), NOW()),
(12, 'TPR', 'TIRUPPUR', TRUE, NOW(), NOW()),
(13, 'POL', 'POLLACHI', TRUE, NOW(), NOW()),
(14, 'UDU', 'UDUMALAI', TRUE, NOW(), NOW()),
(15, 'KGM', 'KANGEYAM', TRUE, NOW(), NOW()),
(16, 'DGL', 'DINDIGUL', TRUE, NOW(), NOW()),
(17, 'ERD', 'ERODE', TRUE, NOW(), NOW()),
(18, 'KRR', 'KARUR', TRUE, NOW(), NOW()),
(19, 'NKL', 'NAMAKKAL', TRUE, NOW(), NOW()),
(20, 'TRY', 'TIRUCHIRAPPALLI', TRUE, NOW(), NOW()),
(21, 'TNJ', 'THANJAVUR', TRUE, NOW(), NOW()),
(22, 'KUM', 'KUMBAKONAM', TRUE, NOW(), NOW()),
(23, 'SLM', 'SALEM', TRUE, NOW(), NOW()),
(24, 'DRM', 'DHARMAPURI', TRUE, NOW(), NOW()),
(25, 'KRI', 'KRISHNAGIRI', TRUE, NOW(), NOW()),
(26, 'HOS', 'HOSUR', TRUE, NOW(), NOW()),
(27, 'BLR', 'BENGALURU', TRUE, NOW(), NOW()),
(28, 'MDU', 'MADURAI', TRUE, NOW(), NOW()),
(29, 'TVL', 'TIRUNELVELI', TRUE, NOW(), NOW()),
(30, 'TUT', 'THOOTHUKUDI', TRUE, NOW(), NOW()),
(31, 'NGL', 'NAGERCOIL', TRUE, NOW(), NOW()),
(32, 'SKC', 'SIVAKASI', TRUE, NOW(), NOW()),
(33, 'PDK', 'PUDUKKOTTAI', TRUE, NOW(), NOW()),
(34, 'PKT', 'PATTUKKOTTAI', TRUE, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
