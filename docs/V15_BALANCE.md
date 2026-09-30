# Seasonal demand and delayed marketing

Demand index: Apr 1.02, May 1.04, Jun 1.15, Jul 1.40, Aug 1.50, Sep 1.45, Oct 1.35, Nov 1.12, Dec .55, Jan .40, Feb .48, Mar .95. Actual sales also depend on service, inventory and visitor caps.

Improvement costs 30,000 yen and reduces owner service to 80% that month. Its .24 attraction contribution matures over six months starting four months later. Sponsorship costs 200,000 yen and similarly contributes .36. Neither grants instant recognition. Sales still have immediate discount/purchase-volume effects; only sales with actual purchases schedule .16 seasonal repeat demand twelve months later for three months, capped at .40 for overlapping campaigns. These effects expire; baseline attraction decays. Existing saves remain compatible; newly performed actions use the delayed system.

Deterministic noise=1 comparisons, default salary/living costs:
- Prudent: seasonal recommended inventory; improvement in November and February. Year 1 net -559,905 yen, year 2 -271,265, year 3 -144,005. No insolvency.
- Neglect: recommended inventory and only tending. Year 1 -423,330, year 2 -758,830, year 3 -961,680.
- Overexpansion: warehouse September, freezer October, then fill bait storage. First March cash 599,580 yen vs 8,034,600 with restrained replenishment. Overexpansion does not mechanically force insolvency; financing and corrective decisions can rescue the business.

22 regression tests and DOM interaction smoke pass. Tests cover lag, year-later seasonal return, expiration, save roundtrip, first two modest-loss years and deterioration without effort. Figures are scenario outcomes, not guaranteed player results. Prior v14 balance figures are superseded.
