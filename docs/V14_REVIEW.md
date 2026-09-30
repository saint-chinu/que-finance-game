# v14 review changes

Implemented: attraction decays below 1.0; no zero-sales sale bonus; winter demand 70/55/65%; equipment repricing and useful-life loan caps; owner service 1000; half service in hiring month; staff social insurance; repayment/tax-aware recommendations and downside forecast; maturity renewal; current portion classification; game-estimate corporate tax accrual and May payment; year-end closing journals; cumulative monthly P/L and annual inventory bridge; staged opening journals; old snapshot compaction and v4 migration; annual remuneration selection; lending score corrections and half/full/limit proposals.

Que remarks appear in monthly results every third turn, with character portrait and deterministic context-sensitive Kansai dialogue. Priorities: cash stress, winter losses, improvement action, demand decline, service capacity, steady operation. Reopening statements does not randomize dialogue.

Validation: 20 Node regression tests plus simulated DOM workflow smoke pass. Noise=1 passive monthly replenishment produces first-year net loss of 475,010 yen; winter is unprofitable. Ten-year developed-shop simulation remains solvent; compressed saved state approximately 0.84 MiB. No real mobile browser visual validation was available; DOM smoke is not a screenshot test.

Scope left for later: second-store/diversification systems, eight intra-month live-bait deliveries, trade-credit unlock, detailed real-world tax loss carryforwards/interim tax/audit simulation. Tax rates and underwriting weights here are game assumptions, not a bank's actual proprietary model. Existing acquired equipment retains historical cost on migration.
