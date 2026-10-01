
INSERT INTO users (
    username,
    email,
    password_hash,
    active,
    created_at,
    updated_at
)
VALUES (
           'local-user',
           'local.user@example.com',
           'NOT_CONFIGURED',
           1,
           CURRENT_TIMESTAMP,
           CURRENT_TIMESTAMP
       );