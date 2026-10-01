# Purchase payment options

- Purchase editor defaults to cash. Cash purchases discount each product's net line amount by 2%, rounding down to yen, then apply VAT to the order's net total.
- Credit purchases use regular prices, arrive when the month is confirmed, and create VAT-inclusive accounts payable due the next month. Monthly settlement pays the old liability even if the player switches payment methods. The existing cash crisis flow handles insufficient funds.
- First credit selection shows Que's short explanation. Selection and explanation state are saved with the game and carried into the next month.
- FIFO lots carry their actual remaining acquisition cost. Sales, expiry, live bait losses, manual disposal, inventory details, and profit forecasts use that cost. Opening stock retains its original historical cost.
- Existing saves without costed lots or payables migrate unchanged. Historical three-argument replay operations retain their original undiscounted cash behavior. New payment options are recorded and validated by the server, including cruise operations.
- Purchasing, staffing and investment forecasts, monthly reports, debt schedules and backup validation support the selected payment method.

Validation: full 207-test suite and UI smoke passed, followed by an additional passing cruise replay regression (208 tests total). All 9 payment regressions pass. Cloudflare local smoke passed. Browser verification at 390 × 844 confirmed switching, immediate amount updates, first-use explanation, dismissal and closing the editor.
