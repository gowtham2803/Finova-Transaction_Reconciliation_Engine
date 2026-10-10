ALTER TABLE users ADD COLUMN full_name VARCHAR(150) NULL AFTER email;
ALTER TABLE users ADD COLUMN role VARCHAR(100) NOT NULL DEFAULT 'Financial Operations Lead' AFTER full_name;

UPDATE users 
SET full_name = 'Local Operations Lead', 
    role = 'Financial Operations Lead',
    password_hash = 'pbkdf2$65536$oSLXM3GzovQ1iH1tQhUYqg==$jHTp1hZkpv3FwTf2YVdtN2eq4f4D548HpsaqW4yVMbQ='
WHERE id = 1;

INSERT INTO users (username, email, full_name, role, password_hash, active, created_at, updated_at)
VALUES (
    'operations',
    'operations@yescapital.com',
    'Karthik Subramanian',
    'Financial Operations Lead',
    'pbkdf2$65536$oSLXM3GzovQ1iH1tQhUYqg==$jHTp1hZkpv3FwTf2YVdtN2eq4f4D548HpsaqW4yVMbQ=',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE 
    full_name = VALUES(full_name), 
    role = VALUES(role), 
    password_hash = VALUES(password_hash);
