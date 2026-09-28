
package com.company.reconciliation.reconciliation.engine;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Matches transactions between M In and M Out.
 *
 * Exact matching is based on:
 * - From branch
 * - To branch
 * - Amount
 *
 * Repeated transactions are supported using queues.
 */
@Component
public class TransactionMatcher {

    /**
     * Matches M In and M Out transactions.
     *
     * @param mInTransactions transactions from M In
     * @param mOutTransactions transactions from M Out
     * @return matching results, amount mismatch candidates,
     *         and remaining unmatched transactions
     */
    public TransactionMatchingResult match(
            List<NormalizedTransaction> mInTransactions,
            List<NormalizedTransaction> mOutTransactions) {

        Objects.requireNonNull(mInTransactions,
                "M In transactions cannot be null");

        Objects.requireNonNull(mOutTransactions,
                "M Out transactions cannot be null");

        // Store M In transactions by their exact matching key.
        Map<MatchingKey, Deque<NormalizedTransaction>> mInMap =
                new LinkedHashMap<>();

        for (NormalizedTransaction transaction : mInTransactions) {
            validateForMatching(transaction);

            MatchingKey key = createMatchingKey(transaction);

            mInMap.computeIfAbsent(
                    key,
                    ignored -> new ArrayDeque<>()
            ).addLast(transaction);
        }

        List<ReconciliationMatch> matches = new ArrayList<>();

        List<NormalizedTransaction> unmatchedMOut =
                new ArrayList<>();

        // Track exact matched M In occurrences.
        Set<NormalizedTransaction> matchedMIn =
                Collections.newSetFromMap(new IdentityHashMap<>());

        // Process each M Out transaction.
        for (NormalizedTransaction mOut : mOutTransactions) {
            validateForMatching(mOut);

            MatchingKey key = createMatchingKey(mOut);

            Deque<NormalizedTransaction> queue = mInMap.get(key);

            if (queue != null && !queue.isEmpty()) {

                // Consume only one occurrence.
                NormalizedTransaction mIn = queue.removeFirst();

                matches.add(new ReconciliationMatch(
                        key,
                        mIn,
                        mOut
                ));

                matchedMIn.add(mIn);

            } else {
                unmatchedMOut.add(mOut);
            }
        }

        // Identify M In transactions that were not
        // consumed during exact matching.
        List<NormalizedTransaction> unmatchedMIn =
                new ArrayList<>();

        for (NormalizedTransaction mIn : mInTransactions) {
            if (!matchedMIn.contains(mIn)) {
                unmatchedMIn.add(mIn);
            }
        }

        // Group remaining M In transactions by route.
        Map<RouteKey, Deque<NormalizedTransaction>> routeMap =
                new LinkedHashMap<>();

        for (NormalizedTransaction mIn : unmatchedMIn) {
            RouteKey routeKey = createRouteKey(mIn);

            routeMap.computeIfAbsent(
                    routeKey,
                    ignored -> new ArrayDeque<>()
            ).addLast(mIn);
        }

        List<AmountMismatch> amountMismatches =
                new ArrayList<>();

        Set<NormalizedTransaction> mismatchMIn =
                Collections.newSetFromMap(new IdentityHashMap<>());

        Set<NormalizedTransaction> mismatchMOut =
                Collections.newSetFromMap(new IdentityHashMap<>());

        // Pair remaining transactions on the same route.
        // Input occurrence order is used only to pair
        // unmatched candidates, not as a matching key.
        for (NormalizedTransaction mOut : unmatchedMOut) {

            RouteKey routeKey = createRouteKey(mOut);

            Deque<NormalizedTransaction> queue =
                    routeMap.get(routeKey);

            if (queue != null && !queue.isEmpty()) {

                NormalizedTransaction mIn = queue.removeFirst();

                amountMismatches.add(
                        new AmountMismatch(mIn, mOut)
                );

                mismatchMIn.add(mIn);
                mismatchMOut.add(mOut);
            }
        }

        // Remove amount mismatch candidates from the
        // remaining unmatched collections.
        List<NormalizedTransaction> remainingMIn =
                unmatchedMIn.stream()
                        .filter(transaction ->
                                !mismatchMIn.contains(transaction))
                        .toList();

        List<NormalizedTransaction> remainingMOut =
                unmatchedMOut.stream()
                        .filter(transaction ->
                                !mismatchMOut.contains(transaction))
                        .toList();

        return new TransactionMatchingResult(
                matches,
                amountMismatches,
                remainingMIn,
                remainingMOut
        );
    }

    /**
     * Creates an exact matching key.
     */
    private MatchingKey createMatchingKey(
            NormalizedTransaction transaction) {

        return new MatchingKey(
                transaction.fromBranchId(),
                transaction.toBranchId(),
                transaction.amount()
        );
    }

    /**
     * Creates a route-only key.
     */
    private RouteKey createRouteKey(
            NormalizedTransaction transaction) {

        return new RouteKey(
                transaction.fromBranchId(),
                transaction.toBranchId()
        );
    }

    /**
     * Ensures the minimum required data exists
     * before matching.
     *
     * Detailed business validation will be handled
     * separately by the reconciliation workflow.
     */
    private void validateForMatching(
            NormalizedTransaction transaction) {

        if (transaction == null) {
            throw new IllegalArgumentException(
                    "Transaction cannot be null");
        }

        if (transaction.fromBranchId() == null) {
            throw new IllegalArgumentException(
                    "From branch ID cannot be null");
        }

        if (transaction.toBranchId() == null) {
            throw new IllegalArgumentException(
                    "To branch ID cannot be null");
        }

        if (transaction.amount() == null) {
            throw new IllegalArgumentException(
                    "Transaction amount cannot be null");
        }
    }
}