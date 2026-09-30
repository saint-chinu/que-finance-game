# v18 effort-dependent demand

Removed all turn-based automatic recognition gains. Awareness starts at .78 and stays unchanged without matured marketing. Monthly attraction declines .4% in year 1, 1.2% subsequently, plus decay on excess attraction. A floor of .35 prevents demand from vanishing entirely. Matured gradual marketing increases awareness by half its attraction contribution, capped at 1.2. Existing deferred seasonal repeat visits remain temporary. No new effort means eventual exhaustion of delayed benefits and declining demand, holding season and capacity constant.

Noise=1, recommended seasonal inventory:
- Austere (180k officer salary,120k living, only tending): year 1 +90,774; year 2 -143,370; year 3 -821,700 yen.
- Ordinary effort (default salary/living, improve November/February): -1,551,670; -453,195; +48,778 yen.

New regression asserts effective attraction declines each month without effort over 36 months, recognition never rises, year 2 goes red, and year 3 deteriorates. Earlier version simulations are superseded. Existing saves without a recognition field start using .78 for subsequent demand; stored financial history remains unchanged.
