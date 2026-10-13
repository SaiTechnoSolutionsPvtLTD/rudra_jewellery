# 13. GAPS, RISKS, ANOMALIES & DISCREPANCIES AUDIT

**System:** Rudhra Jewellers ERP  
**Audit Scope:** Codebase Vulnerabilities, Financial Inaccuracies, Stock Discrepancies, and Architectural Gaps  
**Evidence Source:** Discovered through static code analysis of Laravel controllers, database migrations, and React components.

---

## 1. High-Severity Operational & Financial Risks

### Risk 1: Karigar Decoupling & Role Impersonation
- **Severity:** HIGH
- **Evidence:** `app/Models/User.php:96` has `isKarigar()` hardcoded to `return false;`. In `resources/js/context/AuthContext.jsx:102`, `const isKarigar = false;` is permanently hardcoded.
- **Problem:** Artisans cannot log into the software directly. All production updates, scrap returns, and delay reasons are submitted by workshop supervisors. If a supervisor enters an erroneous weight or completed count, there is no digital artisan acknowledgment or two-party signature.
- **Affected Files:** `User.php`, `AuthContext.jsx`, `KarigarManagement.jsx`.
- **Recommended Correction for New ERP:** Implement an Artisan Mobile Portal / Workbench with OTP or PIN authentication allowing Karigars to confirm metal receipt, submit piece completion, and sign off on returned scrap.

---

### Risk 2: Loose Stone Procurement Business Rule Blind Spot
- **Severity:** MEDIUM-HIGH
- **Evidence:** In `WorkOrderController.php:320`:
  ```php
  if (str_contains($mat, 'colour_stone') || str_contains($mat, 'loose_stone')) {
      throw ValidationException::withMessages([
          'material_type' => ['Loose Stone Allocation Prohibited: Karigars procure loose colour stones independently.']
      ]);
  }
  ```
- **Problem:** While company-issued loose stones are prohibited from being debited from the metal vault, artisans frequently mount precious stones (e.g. rubies, emeralds) whose cost is factored into the finished retail price. Because stone procurement is not tracked in the vault, stone costs must be manually injected during invoice creation rather than flowing from standard inventory cost accounting.
- **Affected Files:** `WorkOrderController.php`, `RawMaterial.php`, `SaleService.php`.
- **Recommended Correction for New ERP:** Introduce a dedicated **Gemstone & Stone Vault** (`gemstone_inventory`) tracking carats and piece counts independently of precious metal bullion.

---

### Risk 3: Negative Vault Balance Tolerance
- **Severity:** MEDIUM
- **Evidence:** `RawMaterial::debitAllocation()` allows `current_balance` to drop below zero (e.g. `-50.000g`).
- **Problem:** While this accommodates urgent workshop dispatches before purchase invoices are recorded, prolonged negative balances distort inventory valuation reports on executive dashboards.
- **Affected Files:** `RawMaterial.php`, `StockManagement.jsx`, `DashboardController.php`.
- **Recommended Correction for New ERP:** Allow negative balance for workshop job dispatch, but generate a prominent "Unvouchered Metal Alert" prompting the accountant to record the procurement receipt within 24 hours.

---

## 2. Quantity & Status Synchronization Gaps

### Risk 4: Redundant JSON Columns vs. Relational Tables
- **Severity:** MEDIUM
- **Evidence:** `work_orders.pricing_details` stores serialized JSON containing `items`, `documents`, `job_summary`, and `delay_history`. Meanwhile, `work_order_items`, `work_order_operations`, and `work_order_received_pieces` exist as strongly typed relational tables.
- **Problem:** Over time, updates made via relational endpoints might not update nested JSON properties inside `pricing_details`, creating dual sources of truth.
- **Affected Files:** `WorkOrderController.php`, `WorkOrder.php`.
- **Recommended Correction for New ERP:** Transition completely to normalized relational tables and eliminate duplicate JSON storage.

---

### Risk 5: Old Weight Treatment in Net Gold Calculation
- **Severity:** MEDIUM-HIGH
- **Evidence:** In `WorkOrderController::receivePiece` [Line 2422]:
  $$\text{Net Gold Weight} = \text{Gross Weight} - (\text{Diamond Wt} \times 0.2) - (\text{Colour Stone Wt} \times 0.2) - \mathbf{\text{Old Weight}}$$
- **Problem:** If a customer brings 5g of old gold to be remade into a 15g necklace, the finished gross weight is 15g. Deducting the 5g old gold reduces the recorded "Net Gold Weight" of the finished product to 10g. However, the physical item still contains 15g of gold! The old gold is a **payment credit**, NOT a physical reduction of the finished necklace's metal mass.
- **Affected Files:** `WorkOrderController.php`, `ReceiverWork.jsx`.
- **Recommended Correction for New ERP:** Separate **Physical Metal Content** (Gross minus Stones) from **Commercial Accounting Settlement** (Gross minus Customer Exchange Metal).

---

## 3. UI / Controller Inconsistencies

### Risk 6: Legacy Endpoint Aliases
- **Severity:** LOW
- **Evidence:** In `WorkOrderController.php`:
  - `finalReceive()` [Line 2645] and `receive()` [Line 2666] are backward-compatible wrappers redirecting to `receivePiece()`.
  - In `routes/api.php`, `/receive`, `/final-receive`, and `/receive-piece` all exist concurrently.
- **Problem:** Multiple legacy routes mapping to the same underlying action can confuse front-end developers building new integrations.
- **Recommended Correction for New ERP:** Standardize on clean RESTful actions:
  - `POST /api/work-orders/{id}/pieces` (Intake physical piece)
  - `POST /api/work-orders/{id}/post-inventory` (Finalize stock)
