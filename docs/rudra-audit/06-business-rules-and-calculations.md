# Rudra Jewellery ERP — Master Technical Audit
## Document 06: Business Rules and Calculations

### 1. Fine Weight and Metal Purity Formulas
Fine weight represents the 100% pure 24K equivalent content of any alloyed gold or metal purchase/issue.

$$\text{Effective Touch} = \text{Touch (\%)} + \text{Wastage (\% prob / allowance)}$$
$$\text{Fine Weight (g)} = \frac{\text{Net Weight (g)} \times \text{Effective Touch}}{100}$$

*Example*:
- Net Weight = 100.000g of 22K (91.6% touch) with 1.5% wastage allowance.
- Effective Touch = $91.6 + 1.5 = 93.1\%$
- Fine Weight = $\frac{100.000 \times 93.1}{100} = 93.100\text{g}$ pure 24K.

---

### 2. Strict Unit Isolation & Non-Conversion Rule
- **Gold, Silver, Platinum**: Quantified strictly in **Grams (`g`)** with 3 decimal precision (`0.001g` = 1 milligram).
- **Diamonds & Gemstones**: Quantified strictly in **Carats (`ct`)** with 3 decimal precision, along with stone piece counts.
- **Critical Rule**: $1\text{ ct} = 0.200\text{g}$, but **ERP NEVER converts diamond carats into gold weight** in job orders, reports, or vault accounting. Diamond carats and gold grams must remain completely separated.

---

### 3. Work Order Job Costing & Pricing
$$\text{Item Total} = \text{Gold Value} + \text{Diamond / Stone Value} + \text{Making Charges} + \text{Other Charges}$$
Where:
- $\text{Gold Value} = \text{Total Gold Weight (g)} \times \text{Applicable Metal Rate (₹/g)}$
- $\text{Diamond Value} = \sum (\text{Diamond Cts} \times \text{Diamond Rate per Ct})$
- $\text{Making Charges} = \text{Total Gold Weight (g)} \times \text{Making Charge per Gram (₹/g)}$ (or fixed piece making charge)

---

### 4. Client Physical Gold Deposit vs Cash Conversion
- **Deposit Without Rate**:
  $$\text{Client Pure Gold Balance} = \text{Previous Balance} + \text{Net Pure Weight (g)}$$
  $$\Delta \text{Financial Cash Ledger} = ₹0$$
- **Deposit With Rate**:
  $$\text{Cash Credit (₹)} = \text{Net Pure Weight (g)} \times \text{Agreed Gold Rate (₹/g)}$$
  $$\Delta \text{Client Current Balance (₹)} = -\text{Cash Credit (Credited)}$$

---

### 5. Sales Invoice Taxation & Settlement
$$\text{Taxable Value} = \sum (\text{Line Item Amount}) - \text{Discount} - \text{Old Gold Exchange Value}$$
$$\text{CGST} = \text{Taxable Value} \times 1.5\%$$
$$\text{SGST} = \text{Taxable Value} \times 1.5\%$$
$$\text{IGST (Inter-state)} = \text{Taxable Value} \times 3.0\%$$
$$\text{Total Invoice Amount} = \text{Taxable Value} + \text{Total GST}$$
$$\text{Due Amount} = \text{Total Invoice Amount} - \text{Paid Amount}$$
- Status transitions:
  - $\text{Paid Amount} == 0 \implies \text{status} = \text{'unpaid'}$
  - $0 < \text{Paid Amount} < \text{Total Invoice Amount} \implies \text{status} = \text{'partial'}$
  - $\text{Paid Amount} \ge \text{Total Invoice Amount} \implies \text{status} = \text{'paid'}$
