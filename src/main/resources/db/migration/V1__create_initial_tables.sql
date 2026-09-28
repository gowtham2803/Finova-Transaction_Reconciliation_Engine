CREATE TABLE users (
                       id BIGINT AUTO_INCREMENT PRIMARY KEY,

                       username VARCHAR(100) NOT NULL,
                       email VARCHAR(255) NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,

                       active BOOLEAN NOT NULL DEFAULT TRUE,

                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                       CONSTRAINT uk_users_username UNIQUE (username),
                       CONSTRAINT uk_users_email UNIQUE (email)
);
CREATE TABLE branches (
                          id BIGINT AUTO_INCREMENT PRIMARY KEY,

                          code VARCHAR(50) NOT NULL,
                          name VARCHAR(150) NOT NULL,

                          active BOOLEAN NOT NULL DEFAULT TRUE,

                          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                          CONSTRAINT uk_branches_code UNIQUE (code),
                          CONSTRAINT uk_branches_name UNIQUE (name)
);
CREATE TABLE reconciliations (
                                 id BIGINT AUTO_INCREMENT PRIMARY KEY,

                                 reconciliation_code VARCHAR(50) NOT NULL,
                                 created_by BIGINT NOT NULL,

                                 status VARCHAR(30) NOT NULL,
                                 version INT NOT NULL DEFAULT 1,

                                 started_at TIMESTAMP NULL,
                                 completed_at TIMESTAMP NULL,

                                 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                                 CONSTRAINT uk_reconciliations_code UNIQUE (reconciliation_code),

                                 CONSTRAINT fk_reconciliations_created_by
                                     FOREIGN KEY (created_by)
                                         REFERENCES users(id)
);
CREATE TABLE transactions (
                              id BIGINT AUTO_INCREMENT PRIMARY KEY,

                              reconciliation_id BIGINT NOT NULL,
                              branch_id BIGINT NULL,

                              source_sheet VARCHAR(10) NOT NULL,
                              source_row INT NULL,

                              from_branch_id BIGINT NOT NULL,
                              to_branch_id BIGINT NOT NULL,

                              amount DECIMAL(19,4) NOT NULL,
                              commission DECIMAL(19,4) NOT NULL DEFAULT 0,

                              status VARCHAR(30) NOT NULL,
                              version INT NOT NULL DEFAULT 1,

                              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                              CONSTRAINT fk_transactions_reconciliation
                                  FOREIGN KEY (reconciliation_id)
                                      REFERENCES reconciliations(id),

                              CONSTRAINT fk_transactions_branch
                                  FOREIGN KEY (branch_id)
                                      REFERENCES branches(id),

                              CONSTRAINT fk_transactions_from_branch
                                  FOREIGN KEY (from_branch_id)
                                      REFERENCES branches(id),

                              CONSTRAINT fk_transactions_to_branch
                                  FOREIGN KEY (to_branch_id)
                                      REFERENCES branches(id),

                              CONSTRAINT chk_transactions_source_sheet
                                  CHECK (source_sheet IN ('M_IN', 'M_OUT')),

                              INDEX idx_transactions_reconciliation (reconciliation_id),

                              INDEX idx_transactions_reconciliation_source
                                  (reconciliation_id, source_sheet),

                              INDEX idx_transactions_route
                                  (reconciliation_id, from_branch_id, to_branch_id),

                              INDEX idx_transactions_amount
                                  (reconciliation_id, amount),

                              INDEX idx_transactions_matching
                                  (reconciliation_id, source_sheet, from_branch_id, to_branch_id, amount)
);
CREATE TABLE reconciliation_results (
                                        id BIGINT AUTO_INCREMENT PRIMARY KEY,

                                        reconciliation_id BIGINT NOT NULL,

                                        m_in_transaction_id BIGINT NULL,
                                        m_out_transaction_id BIGINT NULL,

                                        match_status VARCHAR(30) NOT NULL,

                                        error_type VARCHAR(50) NULL,
                                        error_reason VARCHAR(500) NULL,

                                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                        CONSTRAINT fk_results_reconciliation
                                            FOREIGN KEY (reconciliation_id)
                                                REFERENCES reconciliations(id),

                                        CONSTRAINT fk_results_m_in_transaction
                                            FOREIGN KEY (m_in_transaction_id)
                                                REFERENCES transactions(id),

                                        CONSTRAINT fk_results_m_out_transaction
                                            FOREIGN KEY (m_out_transaction_id)
                                                REFERENCES transactions(id),

                                        INDEX idx_results_reconciliation
                                            (reconciliation_id),

                                        INDEX idx_results_m_in
                                            (m_in_transaction_id),

                                        INDEX idx_results_m_out
                                            (m_out_transaction_id)
);
CREATE TABLE reconciliation_errors (
                                       id BIGINT AUTO_INCREMENT PRIMARY KEY,

                                       reconciliation_result_id BIGINT NOT NULL,

                                       error_type VARCHAR(50) NOT NULL,
                                       error_code VARCHAR(50) NOT NULL,
                                       description VARCHAR(1000) NOT NULL,

                                       status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

                                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                                       CONSTRAINT fk_errors_result
                                           FOREIGN KEY (reconciliation_result_id)
                                               REFERENCES reconciliation_results(id),

                                       INDEX idx_errors_result
                                           (reconciliation_result_id),

                                       INDEX idx_errors_status
                                           (status),

                                       INDEX idx_errors_type
                                           (error_type)
);
CREATE TABLE error_resolutions (
                                   id BIGINT AUTO_INCREMENT PRIMARY KEY,

                                   error_id BIGINT NOT NULL,
                                   resolved_by BIGINT NOT NULL,

                                   resolution_type VARCHAR(50) NOT NULL,
                                   reason VARCHAR(1000) NOT NULL,

                                   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                   CONSTRAINT fk_resolutions_error
                                       FOREIGN KEY (error_id)
                                           REFERENCES reconciliation_errors(id),

                                   CONSTRAINT fk_resolutions_user
                                       FOREIGN KEY (resolved_by)
                                           REFERENCES users(id),

                                   INDEX idx_resolutions_error
                                       (error_id),

                                   INDEX idx_resolutions_user
                                       (resolved_by)
);
CREATE TABLE audit_logs (
                            id BIGINT AUTO_INCREMENT PRIMARY KEY,

                            user_id BIGINT NOT NULL,
                            reconciliation_id BIGINT NULL,
                            transaction_id BIGINT NULL,

                            action VARCHAR(50) NOT NULL,
                            field_name VARCHAR(100) NULL,

                            old_value TEXT NULL,
                            new_value TEXT NULL,

                            reason VARCHAR(1000) NULL,
                            request_id VARCHAR(100) NULL,

                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT fk_audit_user
                                FOREIGN KEY (user_id)
                                    REFERENCES users(id),

                            CONSTRAINT fk_audit_reconciliation
                                FOREIGN KEY (reconciliation_id)
                                    REFERENCES reconciliations(id),

                            CONSTRAINT fk_audit_transaction
                                FOREIGN KEY (transaction_id)
                                    REFERENCES transactions(id),

                            INDEX idx_audit_user
                                (user_id),

                            INDEX idx_audit_reconciliation
                                (reconciliation_id),

                            INDEX idx_audit_transaction
                                (transaction_id),

                            INDEX idx_audit_created_at
                                (created_at)
);