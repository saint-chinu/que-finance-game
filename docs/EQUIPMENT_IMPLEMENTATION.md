# 2026-09-29 Equipment and inventory update

Updated existing Site, preserving financial-statement and bank scoring interfaces. Static source split into engine.js (pure integer-yen accounting), legacy.js (existing reports), shop.js (new UI).

Implemented: opening proprietor + zero staff; five initial product categories plus freezer/live aji unlocks and year-2 wear; cash purchases; t+2 card collection; perishable FIFO lots; ambient/frozen six/three month expiry; live aji 5% pre-sale monthly deaths; separate storage/customer/service ceilings; atomic immediate equipment purchases; monthly upkeep/depreciation; monthly investment action; part-time staff action; inventory counts/icons; generated equipment sprites; aquarium with up to 20 representative swimming fish and exact count; 6-month logs; first-time journal then statement stages; local persistence.

Layout decision: compact stock/equipment tiles and a current statement summary remain visible. Detailed orders, pricing and personal expense controls are collapsed. Equipment costs live in purchase/detail dialogs; aquarium opens only on request. Mobile statement halves stack vertically. Generated images are illustrations, not product photos.

Initial prices/upkeep/caps match ACC-12. Ambient bait no longer discarded each month. Initial cash 5,457,000 yen after startup assets and inventory. Part-time staff cost 120,000 yen/month and add 700 customer service capacity; no automatic customer demand. Up to three staff. Payroll treatment is simplified.

Old finance-game-v2 storage is retained untouched; v3 starts a new business because inventory units and startup journal no longer match. This is explained at startup. v3 stores complete entries/history and only limits log view to six months. Saved animation queue survives reload.

Checks: node syntax on all scripts; 10 engine tests include fixed normal-month 2,437,500 sales/157,750 profit, t+2 collection, purchases/capacity, deadlines, 24-month deterministic save/replay invariants. DOM-contract smoke validates script initialization, purchase, learning sequence, live tank counts and read-only viewing. This is not actual browser layout or iPhone testing: the static Site has no supported managed preview. Long-run balancing across 200 seeds and actual device UX remain unverified.

Existing limitations retained: bank screen calculates ratings/limits but does not execute loans or amortization; fiscal view does not yet implement full corporate-tax settlement. These features are not claimed newly completed. Game-tuned figures are not real-store benchmarks or tax guidance. All equipment money affects real in-game ledger.
