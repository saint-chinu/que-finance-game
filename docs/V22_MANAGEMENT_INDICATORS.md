# Management indicators menu

Dedicated 経営指標 modal available from command header. Eight metrics show calculation, meaning, improvement options and actual assessment scores. Book and bank-adjusted balance sheet ratios are side by side. Calculation bases listed in expandable table; no completed annual accounts means profitability/debt metrics and normal overall assessment remain unavailable.

Assessment weights sum to 100: equity ratio20, debt repayment years20, operating margin15, current ratio10, fixed-long conformity10, quick ratio10, working capital cycle5, revenue growth10. Missing metrics retain existing available-weight normalization; owner/trend penalties apply afterwards. New current-ratio thresholds: >=200% 10, >=150% 8, >=100% 5, >=80% 2, otherwise0. Fixed-long: <=70%10, <=100%8, <=120%4, above/denominator<=0 0. These are game weights, not an actual bank model.

Current assets contain VAT receivables/prepayments; current liabilities contain taxes and next-year long debt principal. Fixed assets net depreciation include security deposit. Fixed-long denominator is equity plus fixed liabilities, so owner-debt reclassification does not double-count long-term funds. Owner receivables reduce both analytical assets and equity. Negative/zero denominators explicitly handled.

Reference methodology:
https://www.jfc.go.jp/cgi-bin/n/zaimu/print.cgi
https://www.jfc.go.jp/n/findings/pdf/sme_findings2_01.pdf

37 regression tests and DOM-contract smoke pass, including ratio calculations, owner adjustments, zero denominators, menu rendering and scoring integration. Browser visual QA not performed.
