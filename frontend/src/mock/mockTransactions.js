export const initialMockTransactions = [
    // ==========================================
    // RECONCILIATION 1: M_IN TRANSACTIONS (23 rows)
    // ==========================================
    {
        id: 101,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 1,
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        fromBranchId: 5, // Salem
        fromBranchName: "Salem",
        amount: 100000,
        commission: 150,
        status: "MATCHED",
        matchedTransactionId: 201,
        matchDetails: {
            counterpartId: 201,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Salem",
            counterpartTo: "Chennai",
            counterpartAmount: 100000,
            counterpartCommission: 0,
            notes: "Exact amount matched. Commission collected on M_IN only."
        }
    },
    {
        id: 102,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 2,
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        fromBranchId: 3, // Coimbatore
        fromBranchName: "Coimbatore",
        amount: 250000,
        commission: 120,
        status: "MATCHED",
        matchedTransactionId: 202,
        matchDetails: {
            counterpartId: 202,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Coimbatore",
            counterpartTo: "Chennai",
            counterpartAmount: 250000,
            counterpartCommission: 0,
            notes: "Exact amount matched. Commission collected on M_IN only."
        }
    },
    {
        id: 103,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 3,
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        fromBranchId: 5, // Salem (Duplicate valid transaction #1)
        fromBranchName: "Salem",
        amount: 150000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 203,
        matchDetails: {
            counterpartId: 203,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Salem",
            counterpartTo: "Chennai",
            counterpartAmount: 150000,
            counterpartCommission: 180,
            notes: "Matched pair 1. Commission collected on M_OUT."
        }
    },
    {
        id: 104,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 4,
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        fromBranchId: 5, // Salem (Duplicate valid transaction #2 - same amount/branches, separate transaction)
        fromBranchName: "Salem",
        amount: 150000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 204,
        matchDetails: {
            counterpartId: 204,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Salem",
            counterpartTo: "Chennai",
            counterpartAmount: 150000,
            counterpartCommission: 180,
            notes: "Matched pair 2. Valid recurring transfer."
        }
    },
    {
        id: 105,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 5,
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        fromBranchId: 2, // Madurai
        fromBranchName: "Madurai",
        amount: 200000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 205,
        matchDetails: {
            counterpartId: 205,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Madurai",
            counterpartTo: "Chennai",
            counterpartAmount: 200000,
            counterpartCommission: 250,
            notes: "Exact amount match. Commission collected on M_OUT."
        }
    },
    {
        id: 106,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 6,
        toBranchId: 3, // Coimbatore
        toBranchName: "Coimbatore",
        fromBranchId: 1, // Chennai
        fromBranchName: "Chennai",
        amount: 500000,
        commission: 450,
        status: "MATCHED",
        matchedTransactionId: 206,
        matchDetails: {
            counterpartId: 206,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Chennai",
            counterpartTo: "Coimbatore",
            counterpartAmount: 500000,
            counterpartCommission: 0,
            notes: "Exact match."
        }
    },
    {
        id: 107,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 7,
        toBranchId: 3, // Coimbatore
        toBranchName: "Coimbatore",
        fromBranchId: 4, // Trichy
        fromBranchName: "Trichy",
        amount: 320000,
        commission: 200, // ERROR: Both sides collect commission
        status: "ERROR",
        matchedTransactionId: 207,
        errorType: "COMMISSION_ERROR",
        errorReason: "Dual commission detected: M_IN collected ₹200 and M_OUT collected ₹150. Only one side should collect commission.",
        matchDetails: {
            counterpartId: 207,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Trichy",
            counterpartTo: "Coimbatore",
            counterpartAmount: 320000,
            counterpartCommission: 150,
            notes: "Dual commission issue."
        }
    },
    {
        id: 108,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 8,
        toBranchId: 2, // Madurai
        toBranchName: "Madurai",
        fromBranchId: 1, // Chennai
        fromBranchName: "Chennai",
        amount: 450000,
        commission: 0, // ERROR: Neither side collects commission
        status: "ERROR",
        matchedTransactionId: 208,
        errorType: "COMMISSION_ERROR",
        errorReason: "Zero commission detected on both sides. Exactly one side must collect commission.",
        matchDetails: {
            counterpartId: 208,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Chennai",
            counterpartTo: "Madurai",
            counterpartAmount: 450000,
            counterpartCommission: 0,
            notes: "Neither side collected commission."
        }
    },
    {
        id: 109,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 9,
        toBranchId: 4, // Trichy
        toBranchName: "Trichy",
        fromBranchId: 5, // Salem
        fromBranchName: "Salem",
        amount: 180000, // M_OUT is 175000 -> AMOUNT_MISMATCH
        commission: 100,
        status: "ERROR",
        matchedTransactionId: 209,
        errorType: "AMOUNT_MISMATCH",
        errorReason: "Amount variance: M_IN recorded ₹1,80,000 but M_OUT recorded ₹1,75,000 (Difference: ₹5,000).",
        matchDetails: {
            counterpartId: 209,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Salem",
            counterpartTo: "Trichy",
            counterpartAmount: 175000,
            counterpartCommission: 0,
            notes: "Variance of ₹5,000."
        }
    },
    {
        id: 110,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 10,
        toBranchId: 5, // Salem
        toBranchName: "Salem",
        fromBranchId: 2, // Madurai
        fromBranchName: "Madurai",
        amount: 95000,
        commission: 0,
        status: "UNMATCHED",
        matchedTransactionId: null,
        errorType: "MISSING_TRANSACTION",
        errorReason: "No corresponding M_OUT record found for Madurai -> Salem transfer.",
        matchDetails: null
    },
    {
        id: 111,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 11,
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        fromBranchId: 4, // Trichy
        fromBranchName: "Trichy",
        amount: 600000,
        commission: 500,
        status: "MATCHED",
        matchedTransactionId: 211,
        matchDetails: {
            counterpartId: 211,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Trichy",
            counterpartTo: "Chennai",
            counterpartAmount: 600000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 112,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 12,
        toBranchId: 2, // Madurai
        toBranchName: "Madurai",
        fromBranchId: 3, // Coimbatore
        fromBranchName: "Coimbatore",
        amount: 220000,
        commission: 150,
        status: "MATCHED",
        matchedTransactionId: 212,
        matchDetails: {
            counterpartId: 212,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Coimbatore",
            counterpartTo: "Madurai",
            counterpartAmount: 220000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 113,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 13,
        toBranchId: 4, // Trichy
        toBranchName: "Trichy",
        fromBranchId: 1, // Chennai
        fromBranchName: "Chennai",
        amount: 100000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 213,
        matchDetails: {
            counterpartId: 213,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Chennai",
            counterpartTo: "Trichy",
            counterpartAmount: 100000,
            counterpartCommission: 110,
            notes: "Matched."
        }
    },
    {
        id: 114,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 14,
        toBranchId: 5, // Salem
        toBranchName: "Salem",
        fromBranchId: 1, // Chennai
        fromBranchName: "Chennai",
        amount: 350000,
        commission: 220,
        status: "MATCHED",
        matchedTransactionId: 214,
        matchDetails: {
            counterpartId: 214,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Chennai",
            counterpartTo: "Salem",
            counterpartAmount: 350000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 115,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 15,
        toBranchId: 3, // Coimbatore
        toBranchName: "Coimbatore",
        fromBranchId: 5, // Salem
        fromBranchName: "Salem",
        amount: 410000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 215,
        matchDetails: {
            counterpartId: 215,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Salem",
            counterpartTo: "Coimbatore",
            counterpartAmount: 410000,
            counterpartCommission: 300,
            notes: "Matched."
        }
    },
    {
        id: 116,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 16,
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        fromBranchId: 2, // Madurai
        fromBranchName: "Madurai",
        amount: 80000,
        commission: 0,
        status: "UNMATCHED",
        matchedTransactionId: null,
        errorType: "MISSING_TRANSACTION",
        errorReason: "No corresponding M_OUT record found in clearing pool.",
        matchDetails: null
    },
    {
        id: 117,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 17,
        toBranchId: 2, // Madurai
        toBranchName: "Madurai",
        fromBranchId: 4, // Trichy
        fromBranchName: "Trichy",
        amount: 140000,
        commission: 90,
        status: "MATCHED",
        matchedTransactionId: 217,
        matchDetails: {
            counterpartId: 217,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Trichy",
            counterpartTo: "Madurai",
            counterpartAmount: 140000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 118,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 18,
        toBranchId: 4, // Trichy
        toBranchName: "Trichy",
        fromBranchId: 3, // Coimbatore
        fromBranchName: "Coimbatore",
        amount: 275000,
        commission: 160,
        status: "MATCHED",
        matchedTransactionId: 218,
        matchDetails: {
            counterpartId: 218,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Coimbatore",
            counterpartTo: "Trichy",
            counterpartAmount: 275000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 119,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 19,
        toBranchId: 5, // Salem
        toBranchName: "Salem",
        fromBranchId: 4, // Trichy
        fromBranchName: "Trichy",
        amount: 125000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 219,
        matchDetails: {
            counterpartId: 219,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Trichy",
            counterpartTo: "Salem",
            counterpartAmount: 125000,
            counterpartCommission: 85,
            notes: "Matched."
        }
    },
    {
        id: 120,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 20,
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        fromBranchId: 3, // Coimbatore
        fromBranchName: "Coimbatore",
        amount: 720000,
        commission: 400,
        status: "MATCHED",
        matchedTransactionId: 220,
        matchDetails: {
            counterpartId: 220,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Coimbatore",
            counterpartTo: "Chennai",
            counterpartAmount: 720000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 121,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 21,
        toBranchId: 3, // Coimbatore
        toBranchName: "Coimbatore",
        fromBranchId: 2, // Madurai
        fromBranchName: "Madurai",
        amount: 310000,
        commission: 190,
        status: "MATCHED",
        matchedTransactionId: 221,
        matchDetails: {
            counterpartId: 221,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Madurai",
            counterpartTo: "Coimbatore",
            counterpartAmount: 310000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 122,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 22,
        toBranchId: 2, // Madurai
        toBranchName: "Madurai",
        fromBranchId: 5, // Salem
        fromBranchName: "Salem",
        amount: 195000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 222,
        matchDetails: {
            counterpartId: 222,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Salem",
            counterpartTo: "Madurai",
            counterpartAmount: 195000,
            counterpartCommission: 130,
            notes: "Matched."
        }
    },
    {
        id: 123,
        reconciliationId: 1,
        sourceSheet: "M_IN",
        sourceRow: 23,
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        fromBranchId: 5, // Salem
        fromBranchName: "Salem",
        amount: 520000,
        commission: 310,
        status: "MATCHED",
        matchedTransactionId: 223,
        matchDetails: {
            counterpartId: 223,
            counterpartSheet: "M_OUT",
            counterpartFrom: "Salem",
            counterpartTo: "Chennai",
            counterpartAmount: 520000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },

    // ==========================================
    // RECONCILIATION 1: M_OUT TRANSACTIONS (23 rows)
    // ==========================================
    {
        id: 201,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 1,
        fromBranchId: 5, // Salem
        fromBranchName: "Salem",
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        amount: 100000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 101,
        matchDetails: {
            counterpartId: 101,
            counterpartSheet: "M_IN",
            counterpartFrom: "Salem",
            counterpartTo: "Chennai",
            counterpartAmount: 100000,
            counterpartCommission: 150,
            notes: "Exact amount matched. Commission collected on M_IN only."
        }
    },
    {
        id: 202,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 2,
        fromBranchId: 3, // Coimbatore
        fromBranchName: "Coimbatore",
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        amount: 250000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 102,
        matchDetails: {
            counterpartId: 102,
            counterpartSheet: "M_IN",
            counterpartFrom: "Coimbatore",
            counterpartTo: "Chennai",
            counterpartAmount: 250000,
            counterpartCommission: 120,
            notes: "Exact amount matched. Commission on M_IN."
        }
    },
    {
        id: 203,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 3,
        fromBranchId: 5, // Salem (Duplicate valid transaction #1 counterpart)
        fromBranchName: "Salem",
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        amount: 150000,
        commission: 180,
        status: "MATCHED",
        matchedTransactionId: 103,
        matchDetails: {
            counterpartId: 103,
            counterpartSheet: "M_IN",
            counterpartFrom: "Salem",
            counterpartTo: "Chennai",
            counterpartAmount: 150000,
            counterpartCommission: 0,
            notes: "Matched pair 1 counterpart."
        }
    },
    {
        id: 204,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 4,
        fromBranchId: 5, // Salem (Duplicate valid transaction #2 counterpart)
        fromBranchName: "Salem",
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        amount: 150000,
        commission: 180,
        status: "MATCHED",
        matchedTransactionId: 104,
        matchDetails: {
            counterpartId: 104,
            counterpartSheet: "M_IN",
            counterpartFrom: "Salem",
            counterpartTo: "Chennai",
            counterpartAmount: 150000,
            counterpartCommission: 0,
            notes: "Matched pair 2 counterpart."
        }
    },
    {
        id: 205,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 5,
        fromBranchId: 2, // Madurai
        fromBranchName: "Madurai",
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        amount: 200000,
        commission: 250,
        status: "MATCHED",
        matchedTransactionId: 105,
        matchDetails: {
            counterpartId: 105,
            counterpartSheet: "M_IN",
            counterpartFrom: "Madurai",
            counterpartTo: "Chennai",
            counterpartAmount: 200000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 206,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 6,
        fromBranchId: 1, // Chennai
        fromBranchName: "Chennai",
        toBranchId: 3, // Coimbatore
        toBranchName: "Coimbatore",
        amount: 500000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 106,
        matchDetails: {
            counterpartId: 106,
            counterpartSheet: "M_IN",
            counterpartFrom: "Chennai",
            counterpartTo: "Coimbatore",
            counterpartAmount: 500000,
            counterpartCommission: 450,
            notes: "Matched."
        }
    },
    {
        id: 207,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 7,
        fromBranchId: 4, // Trichy
        fromBranchName: "Trichy",
        toBranchId: 3, // Coimbatore
        toBranchName: "Coimbatore",
        amount: 320000,
        commission: 150, // ERROR: Both sides collect commission
        status: "ERROR",
        matchedTransactionId: 107,
        errorType: "COMMISSION_ERROR",
        errorReason: "Dual commission detected: M_IN collected ₹200 and M_OUT collected ₹150.",
        matchDetails: {
            counterpartId: 107,
            counterpartSheet: "M_IN",
            counterpartFrom: "Trichy",
            counterpartTo: "Coimbatore",
            counterpartAmount: 320000,
            counterpartCommission: 200,
            notes: "Dual commission detected."
        }
    },
    {
        id: 208,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 8,
        fromBranchId: 1, // Chennai
        fromBranchName: "Chennai",
        toBranchId: 2, // Madurai
        toBranchName: "Madurai",
        amount: 450000,
        commission: 0, // ERROR: Neither side collects commission
        status: "ERROR",
        matchedTransactionId: 108,
        errorType: "COMMISSION_ERROR",
        errorReason: "Zero commission detected on both sides.",
        matchDetails: {
            counterpartId: 108,
            counterpartSheet: "M_IN",
            counterpartFrom: "Chennai",
            counterpartTo: "Madurai",
            counterpartAmount: 450000,
            counterpartCommission: 0,
            notes: "Zero commission on both sides."
        }
    },
    {
        id: 209,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 9,
        fromBranchId: 5, // Salem
        fromBranchName: "Salem",
        toBranchId: 4, // Trichy
        toBranchName: "Trichy",
        amount: 175000, // M_IN is 180000 -> AMOUNT_MISMATCH
        commission: 0,
        status: "ERROR",
        matchedTransactionId: 109,
        errorType: "AMOUNT_MISMATCH",
        errorReason: "Amount variance: M_IN has ₹1,80,000, M_OUT has ₹1,75,000.",
        matchDetails: {
            counterpartId: 109,
            counterpartSheet: "M_IN",
            counterpartFrom: "Salem",
            counterpartTo: "Trichy",
            counterpartAmount: 180000,
            counterpartCommission: 100,
            notes: "Amount mismatch."
        }
    },
    {
        id: 210,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 10,
        fromBranchId: 3, // Coimbatore
        fromBranchName: "Coimbatore",
        toBranchId: 5, // Salem
        toBranchName: "Salem",
        amount: 110000,
        commission: 50,
        status: "UNMATCHED",
        matchedTransactionId: null,
        errorType: "MISSING_TRANSACTION",
        errorReason: "Unmatched outgoing liquidity: No corresponding M_IN transfer found.",
        matchDetails: null
    },
    {
        id: 211,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 11,
        fromBranchId: 4, // Trichy
        fromBranchName: "Trichy",
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        amount: 600000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 111,
        matchDetails: {
            counterpartId: 111,
            counterpartSheet: "M_IN",
            counterpartFrom: "Trichy",
            counterpartTo: "Chennai",
            counterpartAmount: 600000,
            counterpartCommission: 500,
            notes: "Matched."
        }
    },
    {
        id: 212,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 12,
        fromBranchId: 3, // Coimbatore
        fromBranchName: "Coimbatore",
        toBranchId: 2, // Madurai
        toBranchName: "Madurai",
        amount: 220000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 112,
        matchDetails: {
            counterpartId: 112,
            counterpartSheet: "M_IN",
            counterpartFrom: "Coimbatore",
            counterpartTo: "Madurai",
            counterpartAmount: 220000,
            counterpartCommission: 150,
            notes: "Matched."
        }
    },
    {
        id: 213,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 13,
        fromBranchId: 1, // Chennai
        fromBranchName: "Chennai",
        toBranchId: 4, // Trichy
        toBranchName: "Trichy",
        amount: 100000,
        commission: 110,
        status: "MATCHED",
        matchedTransactionId: 113,
        matchDetails: {
            counterpartId: 113,
            counterpartSheet: "M_IN",
            counterpartFrom: "Chennai",
            counterpartTo: "Trichy",
            counterpartAmount: 100000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 214,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 14,
        fromBranchId: 1, // Chennai
        fromBranchName: "Chennai",
        toBranchId: 5, // Salem
        toBranchName: "Salem",
        amount: 350000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 114,
        matchDetails: {
            counterpartId: 114,
            counterpartSheet: "M_IN",
            counterpartFrom: "Chennai",
            counterpartTo: "Salem",
            counterpartAmount: 350000,
            counterpartCommission: 220,
            notes: "Matched."
        }
    },
    {
        id: 215,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 15,
        fromBranchId: 5, // Salem
        fromBranchName: "Salem",
        toBranchId: 3, // Coimbatore
        toBranchName: "Coimbatore",
        amount: 410000,
        commission: 300,
        status: "MATCHED",
        matchedTransactionId: 115,
        matchDetails: {
            counterpartId: 115,
            counterpartSheet: "M_IN",
            counterpartFrom: "Salem",
            counterpartTo: "Coimbatore",
            counterpartAmount: 410000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 216,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 16,
        fromBranchId: 4, // Trichy
        fromBranchName: "Trichy",
        toBranchId: 5, // Salem
        toBranchName: "Salem",
        amount: 65000,
        commission: 30,
        status: "UNMATCHED",
        matchedTransactionId: null,
        errorType: "MISSING_TRANSACTION",
        errorReason: "No corresponding M_IN transfer found in destination branch records.",
        matchDetails: null
    },
    {
        id: 217,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 17,
        fromBranchId: 4, // Trichy
        fromBranchName: "Trichy",
        toBranchId: 2, // Madurai
        toBranchName: "Madurai",
        amount: 140000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 117,
        matchDetails: {
            counterpartId: 117,
            counterpartSheet: "M_IN",
            counterpartFrom: "Trichy",
            counterpartTo: "Madurai",
            counterpartAmount: 140000,
            counterpartCommission: 90,
            notes: "Matched."
        }
    },
    {
        id: 218,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 18,
        fromBranchId: 3, // Coimbatore
        fromBranchName: "Coimbatore",
        toBranchId: 4, // Trichy
        toBranchName: "Trichy",
        amount: 275000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 118,
        matchDetails: {
            counterpartId: 118,
            counterpartSheet: "M_IN",
            counterpartFrom: "Coimbatore",
            counterpartTo: "Trichy",
            counterpartAmount: 275000,
            counterpartCommission: 160,
            notes: "Matched."
        }
    },
    {
        id: 219,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 19,
        fromBranchId: 4, // Trichy
        fromBranchName: "Trichy",
        toBranchId: 5, // Salem
        toBranchName: "Salem",
        amount: 125000,
        commission: 85,
        status: "MATCHED",
        matchedTransactionId: 119,
        matchDetails: {
            counterpartId: 119,
            counterpartSheet: "M_IN",
            counterpartFrom: "Trichy",
            counterpartTo: "Salem",
            counterpartAmount: 125000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 220,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 20,
        fromBranchId: 3, // Coimbatore
        fromBranchName: "Coimbatore",
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        amount: 720000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 120,
        matchDetails: {
            counterpartId: 120,
            counterpartSheet: "M_IN",
            counterpartFrom: "Coimbatore",
            counterpartTo: "Chennai",
            counterpartAmount: 720000,
            counterpartCommission: 400,
            notes: "Matched."
        }
    },
    {
        id: 221,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 21,
        fromBranchId: 2, // Madurai
        fromBranchName: "Madurai",
        toBranchId: 3, // Coimbatore
        toBranchName: "Coimbatore",
        amount: 310000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 121,
        matchDetails: {
            counterpartId: 121,
            counterpartSheet: "M_IN",
            counterpartFrom: "Madurai",
            counterpartTo: "Coimbatore",
            counterpartAmount: 310000,
            counterpartCommission: 190,
            notes: "Matched."
        }
    },
    {
        id: 222,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 22,
        fromBranchId: 5, // Salem
        fromBranchName: "Salem",
        toBranchId: 2, // Madurai
        toBranchName: "Madurai",
        amount: 195000,
        commission: 130,
        status: "MATCHED",
        matchedTransactionId: 122,
        matchDetails: {
            counterpartId: 122,
            counterpartSheet: "M_IN",
            counterpartFrom: "Salem",
            counterpartTo: "Madurai",
            counterpartAmount: 195000,
            counterpartCommission: 0,
            notes: "Matched."
        }
    },
    {
        id: 223,
        reconciliationId: 1,
        sourceSheet: "M_OUT",
        sourceRow: 23,
        fromBranchId: 5, // Salem
        fromBranchName: "Salem",
        toBranchId: 1, // Chennai
        toBranchName: "Chennai",
        amount: 520000,
        commission: 0,
        status: "MATCHED",
        matchedTransactionId: 123,
        matchDetails: {
            counterpartId: 123,
            counterpartSheet: "M_IN",
            counterpartFrom: "Salem",
            counterpartTo: "Chennai",
            counterpartAmount: 520000,
            counterpartCommission: 310,
            notes: "Matched."
        }
    }
];
