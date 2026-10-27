# Business Rules, Formulas & Mathematical Calculations

**Project**: Rudra Jewellery ERP  
**Analysis Base**: Legacy Visual FoxPro Codebase, `dump.sql`, `company.ini`, `bhav`, `tgm1`, `itran1`

---

## 1. Purity, Karat, Touch & Fine Metal Conversions

In Indian jewellery manufacturing and retail, gold purity is expressed in either **Karats (K)** or **Touch / Fineness (Parts per Thousand / Percentage)**.

| Karat | Standard Stamp | Minimum Touch (%) | Fineness (Ratio) | Description |
|---|---|---|---|---|
| **24K** | 999 / 995 | 99.50% – 99.90% | 0.999 | Pure Bullion / Granules / Primary Gold |
| **22K** | 916 | 91.60% | 0.916 | Hallmarked Standard Jewellery Gold |
| **18K** | 750 | 75.00% | 0.750 | Diamond Jewellery / High-Strength Casting Gold |
| **14K** | 585 | 58.50% | 0.585 | Modern Lightweight / Studded Jewellery |
| **9K** | 375 | 37.50% | 0.375 | Export / Ultra-light Jewellery |
| **Silver** | 925 | 92.50% | 0.925 | Sterling Silver |

### Mathematical Formula for Fine Gold Weight:
$$\text{Fine Gold Weight (g)} = \text{Net Weight (g)} \times \left( \frac{\text{Touch \%}}{100} \right)$$
*Example*: A 22K bangle weighing 15.500 g net at 91.60% touch contains:
$$15.500 \times 0.916 = 14.198 \text{ g pure gold}$$

---

## 2. Weight Deductions & Net Weight Calculation

Every jewellery article possesses Gross Weight and Net Weight:

$$\text{Gross Weight} = \text{Metal Weight} + \text{Diamond Weight} + \text{Gemstone Weight} + \text{Beads / Pearls} + \text{Enamel / Lac (Wax)}$$

$$\text{Less Weight} = (\text{Diamond Cts} \times 0.200) + \text{Gemstone Weight (g)} + \text{Enamel / Foreign Material (g)}$$

$$\text{Net Gold Weight} = \text{Gross Weight} - \text{Less Weight}$$

*Precision Rule*:
- Gold and Silver weights must strictly be recorded to **3 decimal places** (`0.000` grams).
- Diamond weights are recorded in **Carats** (1 Carat = 0.200 grams) to 3 decimal places.
- Foreign material / Enamel / Lac is measured in grams to 3 decimal places.

---

## 3. Wastage (Vaddhu / Dhall) Calculation

In traditional and modern jewellery ERPs, wastage compensates the manufacturer/retailer for metal loss occurring during cutting, filing, polishing, and soldering:

$$\text{Effective Gold Weight} = \text{Net Gold Weight} \times \left( 1 + \frac{\text{Wastage \%}}{100} \right)$$

$$\text{Gold Value (₹)} = \text{Effective Gold Weight} \times \text{Applicable Gold Rate (₹/g)}$$

*Example*: Net Weight = 10.000 g, Wastage = 8%, Gold Rate = ₹7,800/g:
$$\text{Effective Weight} = 10.000 \times 1.08 = 10.800 \text{ g}$$
$$\text{Gold Value} = 10.800 \times 7,800 = ₹84,240.00$$

---

## 4. Making Charges (Labour / Coolie) Models (`LBRON`)

The legacy ERP supports 3 standard making charge computation modes configured by `LBRON`:

### Mode 1: On Gross Weight (`LBRON = 1`)
Used for solid plain gold jewellery where labour is charged across the entire casting mass:
$$\text{Making Charges} = \text{Gross Weight (g)} \times \text{Labour Rate (₹/g)}$$

### Mode 2: On Net Weight (`LBRON = 2`)
Used for studded jewellery so customers do not pay gold labour rates on the weight of stones:
$$\text{Making Charges} = \text{Net Gold Weight (g)} \times \text{Labour Rate (₹/g)}$$

### Mode 3: Flat Per Piece (`LBRON = 3` or `PCRATE`)
Used for branded, designer, or fixed-labour pieces (e.g. nose pins, pendants, coins):
$$\text{Making Charges} = \text{Fixed Flat Amount (₹)}$$

---

## 5. Diamond and Gemstone Valuation

$$\text{Diamond Value (₹)} = \sum_{i} \left( \text{Carats}_i \times \text{Rate Per Carat}_i \right)$$

$$\text{Stone Value (₹)} = \begin{cases} \text{Weight (g or Cts)} \times \text{Rate Per Unit} & \text{if rate is weight-based} \\ \text{Piece Count} \times \text{Rate Per Piece} & \text{if rate is count-based} \end{cases}$$

---

## 6. Old Gold Exchange / Purchase Valuation

When a customer exchanges old jewellery against a new purchase:
1. **Gross Weight**: Old article is weighed.
2. **Dust / Enamel / Stone Deduction**: Impurities and stones removed or estimated.
3. **Melt Purity Assessment (Touch %)**: Determined via Karatmeter XRF or touchstone.
4. **Fine Gold Valuation**:
   $$\text{Old Gold Credit (₹)} = \text{Net Weight (g)} \times \left( \frac{\text{Touch \%}}{100} \right) \times \text{24K Purchase Rate (₹/g)}$$
   *Alternatively*, if calculated at 22K rate:
   $$\text{Old Gold Credit (₹)} = \text{Net Weight (g)} \times \left( \frac{\text{Touch \%}}{91.60} \right) \times \text{22K Purchase Rate (₹/g)}$$

---

## 7. Goods and Services Tax (GST) & Invoice Totals

Under Indian GST Law (Notification No. 11/2017-Central Tax (Rate), HSN Code `7113`):
- **Jewellery Tax Rate**: 3.00%
- **Intra-State Supply**: CGST 1.50% + SGST 1.50%
- **Inter-State Supply**: IGST 3.00%

### Total Invoice Formula:
$$\text{Taxable Value} = \text{Gold Value} + \text{Making Charges} + \text{Diamond Value} + \text{Stone Value} + \text{Hallmarking Charges} - \text{Discount}$$

$$\text{CGST} = \text{Round}(\text{Taxable Value} \times 0.015, 2)$$
$$\text{SGST} = \text{Round}(\text{Taxable Value} \times 0.015, 2)$$
$$\text{Total Invoice Amount} = \text{Taxable Value} + \text{CGST} + \text{SGST}$$

$$\text{Net Amount Payable} = \text{Total Invoice Amount} - \text{Old Gold Credit} - \text{Advance Adjusted}$$

$$\text{Balance Due} = \text{Net Amount Payable} - \text{Amount Paid}$$

---

## 8. Karigar Manufacturing & Metal Reconciliation Formula

For every manufacturing Work Order issued to a Karigar:

$$\text{Issued Pure Gold} = \text{Gross Issued Weight} \times \left( \frac{\text{Issued Touch \%}}{100} \right)$$

$$\text{Received Pure Gold} = \left( \text{Finished Pieces Net Wt} \times \frac{\text{Finished Touch \%}}{100} \right) + \left( \text{Scrap Metal Wt} \times \frac{\text{Scrap Touch \%}}{100} \right)$$

$$\text{Allowed Wastage} = \text{Finished Net Weight} \times \left( \frac{\text{Agreed Karigar Wastage \%}}{100} \right) \times \left( \frac{\text{Finished Touch \%}}{100} \right)$$

$$\text{Metal Discrepancy} = \text{Issued Pure Gold} - \left( \text{Received Pure Gold} + \text{Allowed Wastage} \right)$$

- If $\text{Discrepancy} > 0$: Karigar owes gold to the workshop (debited to Karigar metal ledger).
- If $\text{Discrepancy} < 0$: Karigar saved metal / gained efficiency (credited to Karigar metal ledger).
- If $\text{Discrepancy} = 0$: Perfect reconciliation.
