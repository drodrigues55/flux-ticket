# Dashboard Ranking Engine

Describes the heuristic scoring model used to sort active events.

## Heuristics Scoring Model

| Condition | Points Added |
| --------- | ------------ |
| Proximity $\le$ 7 days | +50 points |
| Proximity $\le$ 3 days | +30 points |
| Underoccupancy vs Target | +20 points |
| Critical active alerts | +40 points |
| Warning active alerts | +20 points |
| Declining sales trend | +25 points |
| Failed Deliveries | +20 points |
| Payment Failures | +15 points |
| Offline sync conflicts | +25 points |

## Setup Scoring for Drafts
- Base score of **15 points** for setup tracking.
- Adds **30 points** if batches/tickets have not been configured.
