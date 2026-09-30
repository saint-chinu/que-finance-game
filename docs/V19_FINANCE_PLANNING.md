# v19 VAT, inventory obsolescence, investment planning and owner financing

## Consumption tax
- Tax-exclusive price/cost ledger, 10% added to customer receipts/card receivables and taxable purchase payments. Existing product/equipment amounts are net prices; gameplay recommendations/validation and forecasts reserve gross cash.
- Startup equipment and inventory include input VAT; refunded security deposit, capital, wages/social premiums, loan principal and interest excluded. Shop rent/advertising/misc equipment operating costs assumed taxable. Eligible invoice suppliers/full input credit assumed.
- Accounts: 仮払消費税等, 仮受消費税等, 未払消費税等, 未収消費税等, 仮払消費税中間納付. March closes input/output, May pays/refunds. Refund timing is a game assumption. Prior combined tax ×78% above 480,000 yen schedules one interim payment; above 4,000,000 schedules three. Model omits filing rounding, reduced rates, simplified tax and special invoice rules; game turnover cannot reach the monthly-interim threshold.
- Tax-exclusive VAT settlement never affects P/L again. Corporation taxes and VAT appear separately in cash bridge and simulation.
- Legacy saves: past financial history unchanged, VAT begins with post-upgrade transactions. Migration notice shown. Save schema 6, prior 4/5 supported.

Sources checked 2026-09-29:
https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6901.htm
https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6375.htm
https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6609.htm
https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6503.htm

## Inventory
FIFO lots preserve purchase month. Model disposal thresholds: tackle 18 months, rod 24, lure 12, reel 30, wear 12. Bait shelf life 6 months, frozen 3, live bait 5% monthly mortality. Full carrying cost moves 商品廃棄損 / 商品; no second cash outflow. These are game rules, not tax useful-life rules. Product details show age/quantity/months until disposal. Annual inventory-to-COGS bridge deducts separately disclosed disposal loss.

## Investment planning
Dedicated full-screen in-game page from 投資計画 and equipment dialogs. Compare no investment, chosen investment, and 15% demand downside over 12 or 24 months. Controls: equipment, timing, assumed loan/rate/term, following-month hire, price, recurring November/February improvement. Same engine handles seasonality, delayed marketing, gross purchases, depreciation, waste, repayment and taxes. Monthly table fixes month label during horizontal scroll. Profit, minimum month-end cash and end cash summary cards. No state, RNG, journal or turn mutation; explicit separate decision returns to current purchase confirmation or actual bank assessment. Future investment is a forecast assumption, not a scheduled transaction or approved loan.

## Owner financing
社長から貸す transfers actual available personal cash to company cash, credits 役員借入金, and never increases profit. No repayment deadline or interest in game. Bank analysis adds owner borrowing to equity and excludes it from debt. Owner receivable balance reduces analytical assets/equity and analytical profit/repayment capacity; existing governance score penalty remains. Statutory/book B/S and P/L remain untouched by analytical adjustments; reconciliation shown in bank details. This is the requested underwriting game rule, not a universal bank convention.

## Verification
31 Node regression tests and DOM-contract UI smoke pass. Covers VAT settlement/refund/prepayments, gross card collection, inventory/BS/loan invariants, owner money conservation, analytical equity adjustment and read-only investment comparison. Not a real browser layout test.
Prudent deterministic 3-year policy still yields -1,551,670, -453,195, +48,778 yen with VAT excluded from profit; cash reflects taxes. No-effort stock becomes more costly when aged inventory is discarded.
