# v23 implementation record

Date: 2026-09-29

This release implements the P0 and P1 items from `経営ゲーム_v22監査・改善実装仕様書.md` while preserving old save economics. New games use `rulesVersion: v23`; migrated saves without a rules version remain on `v22` fixed costs and promotion strength.

## Statements and journals

- Current, unclosed statements now build one provisional report from the current state. The page header, report cash and B/S use the same point in time.
- Each monthly record stores the actual prior month close separately from the post-closing opening balance. April B/S changes compare with March close, while April P/L remains an April-only result.
- Annual COGS reconciliation uses net purchases after retired-product returns.
- The formal B/S keeps assets on the left and liabilities/equity on the right, with current/fixed sections, subtotals, totals, amount and change columns. On phones each side stays visible and each account uses a two-row card to preserve the account-to-number relationship.
- First-month recurring entries are grouped into at most three scenes: sales/cost/VAT, operating expenses and depreciation. Journal replay persists its return target in save version 7.

## Decisions, tutorial and planning

- A new month carries the prior order quantities. The player must request a current replenishment proposal explicitly. The proposal follows the selected price's demand assumption.
- Product order rows and total show exact gross cash payment in yen, with net amount and VAT at the total. Invalid, fractional, negative and oversized direct quantities are rejected instead of silently rounded.
- Hiring uses preview, cancel and final confirmation. It shows salary, employer social cost, half service capacity in the hiring month and full later capacity.
- The first year has twelve monthly lessons covering sales/profit/cash, two-month card collection, margin, summer overstock, assortment, winter cash, delayed promotion, owner/company separation, loans and closing.
- Investment baseline keeps hiring, pricing and promotion assumptions and removes only equipment and its loan. The comparison continues until the longest scenario ends and reports completed, insolvent or invalid-plan status.
- A future investment is a simulation only and cannot be accidentally executed now. When an immediate plan enters bank review, changed amount/rate/term are shown and the plan is recalculated with approved terms before the final loan button.

## Loans and balance

- Startup-loss lending adds recorded interest back to monthly profit once, then deducts next month's existing principal and interest once. Total startup advances, including repaid amounts, cannot exceed ¥1.5 million.
- Startup principal entries are labelled as startup-loss loan repayments, separately from equipment debt.
- New-game fixed operating cost increased by ¥16,500 gross per month and delayed promotion gain reduced from 0.24 to 0.18. Existing v22 saves retain old rules.
- In a 50-seed sample using list price and replenishment proposals, the prudent-policy median annual results were about -¥1.744m, -¥0.484m and +¥0.193m. The frugal first year was profitable in 12/50 paths, so a narrow first-year profit remains possible. All 50 prudent paths reached month 36.

## Verification

- Node syntax checks pass for all changed scripts.
- 41 engine/accounting tests pass.
- DOM-contract smoke covers current-statement consistency, grouped first experience, replay restore, gross order display, invalid quantity rejection and bank-condition replanning.
- Real-browser layout and interaction checks remain unperformed in this environment. The mobile B/S CSS is implemented but should still be checked at 375×812, 390×844, 768×1024 and 1280×800 in Chromium and iOS Safari.
- Loss carryforward remains a separate rules-version change and is not included in v23.
