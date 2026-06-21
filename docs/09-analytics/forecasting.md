# Predictive Analytics & Forecasting

Predictive analytics uses historical sales rates, lot velocity, check-in data, and temporal cues to forecast future states of active events, enabling organizers to optimize operations.

---

## 📈 Forecasting Metrics

### 1. Sales Velocity & Sell-Out Forecasting
* **Objective**: Estimate when ticket batches (lots) or the entire event capacity will sell out.
* **Calculation Model**:
  * **Daily Average Velocity ($V_{avg}$)**: Running average of tickets sold per day over 1, 3, and 7-day windows.
  * **Estimated Days to Sell Out ($T_{sellout}$)**:
    $$T_{sellout} = \frac{\text{Remaining Capacity}}{V_{avg}}$$
* **Dashboard Action**: When $T_{sellout} < 3$ days and remaining capacity is high, trigger a notification so the organizer can prepare to publish the next ticket batch or lot.

### 2. Check-In & Gate Attendance Projections
* **Objective**: Predict peak arrival windows to coordinate entry gate staffing.
* **Calculation Model**:
  * Historical check-in distribution curves from similar event categories are mapped as reference profiles.
  * During the event, real-time sync check-in frequencies are matched against historical curves to calculate estimated arrivals for the next 30, 60, and 90 minutes.
* **Dashboard Action**: Triggers warnings if arrival velocity exceeds current gate processing capacities (based on active operators sync signals).

---

## 🛠️ Data Infrastructure & Rollups

1. **Transactional Sync**:
   * Active sales trends read directly from `Ticket` and `Payment` models.
2. **Materialization**:
   * A future scheduled job (`analytics.aggregate` queue) is planned to write to a `SalesHourlyRollup` table to prevent slow queries over millions of check-in/payment rows.
3. **Execution Window**:
   * Calculation occurs asynchronously in the background. The organizer dashboard reads precalculated projections via a lightweight REST endpoint.
