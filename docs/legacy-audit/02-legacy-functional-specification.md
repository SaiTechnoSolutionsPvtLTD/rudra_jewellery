# Legacy Functional Specification

**Application**: Rudra Jewellers ERP (Jewelly9 / VFP Desktop ERP)  
**Evidence Sources**: `dump.sql`, `altecat.sql`, `mnu.d_`, `formmst.d_`, `formhlp.m_`, `features.m_`, `company.ini`

---

## 1. Account & Entity Master (`accmast`)

The legacy ERP uses a unified account table (`accmast`) that supports polymorphic business roles via boolean flags and specific sub-attributes:

| Role Flag | Entity Type | Specialized Capabilities |
|---|---|---|
| `SALE = 1` | Customer / Retail Client | GSTIN, PAN, State code, Credit days (`CRDAYS`), Credit limit (`CRAMT`), DOB (`DOB`), Anniversary (`ASARY`), Outstanding balance |
| `PURCHASE = 1` | Bullion / Product Supplier | Bank account number, IFSC, TDS applicability, Supplier credit period |
| `KARIGAR = 1` / `JOBID > 0` | Karigar / Artisan / Workshop | Karigar prefix (`KPREFIX`), Metal balances (`WTBAL`, `CRFINE1`, `CRFINE2`), Labour agreement rate (`MINLBR`, `LBRON`), Wastage allowance agreement |
| `SALARY > 0` | Showroom Staff / Employee | Basic salary (`SALARY`), PF number (`PFACNO`), ESI number (`ESIACNO`), Attendance tracking (`attend1`) |
| `KITTY = 1` | Savings Scheme Subscriber | Installment amount (`KINSAMT`), Tenure months (`KMONTHS`), Installments received count (`KINSREC`), Start date (`KSDATE`), End date (`KEDATE`) |

### Key Controls & Validations:
- **Unique Identification**: Unique `ACNO` auto-incrementing key, short code (`SHORTNAME`), and phone/mobile uniqueness checks.
- **Credit Limit & Day Enforcement**: Invoicing verifies `CRAMT` (Credit limit in rupees) and `CRDAYS` (Credit payment terms); alerts are raised if the debtor is overdue.
- **Metal Balance Tracking**: Separate fine gold weight balance (`CRFINE1`) and fine silver weight balance (`CRFINE2`) tracked alongside the rupee currency balance (`CRAMT`).

---

## 2. Product Master, Categories & Designs (`category`, `itemmast`, `design`)

### A. Jewellery Categories (`category`)
- Represents top-level jewellery groups (e.g., Rings, Necklaces, Bangles, Earrings, Chains, Pendants, Mangalsutras, Bullion Coins).
- Flags for retail display, active status, and mobile catalog publishing.

### B. Product & Item Master (`itemmast`)
- Represents standardized product types (e.g., "22K Mens Gold Ring", "18K Diamond Solitaire Pendant").
- **Key Attributes**:
  - `IDESC`: Product Name / Description.
  - `IGROUPID` / `STAMPID`: Default metal purity (24K, 22K 916, 18K 750, 14K 585, Silver 925).
  - `DEFTUNCH`: Standard default purity percentage (e.g., 91.60%, 75.00%).
  - `WSWSTG` / `RETWSTG`: Default wholesale & retail wastage percentages.
  - `WSLBR` / `RETLBR`: Default wholesale & retail making charge rates.
  - `LBRON`: Calculation basis (1 = Gross Weight, 2 = Net Weight, 3 = Per Piece flat).
  - `FINECAL`: Automatic fine weight calculation mode ($\text{Net Wt} \times \text{Tunch} / 100$).
  - `ITHSNCODE` / `GST`: HSN Code (typically `7113` for articles of jewellery) and GST rate (3%).

### C. Design Master (`design`, `desidet`)
- Design code repository (e.g., `DES-101`, `R-5542`).
- Stores standard expected gross weight (`GWT`), net weight (`WT`), diamond carats (`DIAWT`), stone weight (`STNWT`), photo attachment path (`PHOTOPATH`), and linked Karigar specifications.

---

## 3. Daily Metal Rates / Bhav (`bhav`, `rates`)

The legacy ERP manages daily market price fluctuations through the Bhav module:
- **Rate Matrix**:
  - Rate date (`TDATE`).
  - Metal purity stamps (`STAMPID`): 24K Pure Gold, 22K Standard Gold, 18K Diamond Jewellery Gold, 14K Gold, Fine Silver.
  - Purchase Rate (`prate`) vs Selling Rate (`rate`).
  - Badla / Premium / Discount (`PBADLA`, `SBADLA`).
- **Rule of Precedence**:
  - Showroom manual entry takes immediate precedence over automated feeds.
  - When an invoice is created, the system locks in the applicable day's rate for the specific metal purity.

---

## 4. Customer Custom Jewellery Orders (`ord1`, `orddet1`)

The dedicated Customer Order Booking module handles bespoke jewellery fabrication:
1. **Header (`ord1`)**:
   - Order Number (`ORDNO`), Customer (`ACNO`), Order Date (`TDATE`), Promised Delivery Date (`DDATE`), Reference, Priority, Remarks.
2. **Line Items (`orddet1`)**:
   - Item Master (`INO`), Design (`DESIGNID`), Quantity (`PC`), Estimated Gross Weight (`GWT`), Target Net Weight (`PCWT`), Stamp/Purity (`STAMPID`), Special artisan instructions (`REMARK`).
3. **Advance Payments**:
   - Cash / Bank advance, or Old Gold advance (fixing gold rate or metal weight against the order).
4. **Lifecycle**:
   - `Booked` $\rightarrow$ `Job Assigned (Karigar)` $\rightarrow$ `In Production` $\rightarrow$ `Received & Tagged` $\rightarrow$ `Ready for Delivery` $\rightarrow$ `Billed / Invoiced`.

---

## 5. Work Orders, Karigar Job Work & Metal Issue/Receipt (`job`, `jobmast`, `gissue1`, `grcpt1`)

This is the operational manufacturing engine:
- **Work Order Assignment (`jobmast`)**:
  - Job No (`JOBNO`), Design, Target Purity (`TUNCH`, `STAMPID`), Target Gross/Net Weight, Karigar Account (`KACNO`), Promised Delivery Date (`DELDATE`).
- **Metal Issue to Karigar (`gissue1`, `gisdet1`)**:
  - Issues pure gold bullion or alloy to the Karigar.
  - Records Gross Weight (`GOLDGWT`), Touch/Purity % (`GOLDTUNCH`), and Fine Gold Weight (`GOLDFINE`).
- **Metal Receipt from Karigar (`grcpt1`, `grcdet1`)**:
  - Receives completed physical pieces, scrap metal (Ghat), and dust.
  - Calculates allowed wastage vs actual wastage.
  - Reconciles Karigar metal ledger.

---

## 6. Physical Tagging, Piece QC & Hallmarking (`tgm1`, `tgd1`, `tggen1`)

Every physical finished piece in inventory is uniquely tagged:
1. **Tag Master (`tgm1`)**:
   - Unique alphanumeric Tag No (`TGNO`), Numeric sequence (`vtgno`).
   - Associated Work Order (`JOBID`), Design (`DESIGN`), Karigar (`karigar`).
   - Gross Weight (`GWT`), Less/Stone Weight (`LESSWT`), Net Gold Weight (`WT`).
   - Diamond Weight (`DIAWT`), Gemstone Weight (`STNWT`).
   - Metal Purity (`TUNCH`), Wastage % (`WSTG`), Making Charge Rate (`SLBR`), Calculation basis (`LBRON`).
   - Hallmark HUID (`hm`) and Lab Certificate No (`CERTNO`).
   - Status: `in_stock`, `sold`, `approval`, `repair`, `transferred`.
2. **Tag Breakdown (`tgd1`)**:
   - Stores component-level details (individual stone counts, stone types, diamond clarity/color, pearl weight) for two-row tag printing and itemized billing.

---

## 7. Sales Invoicing, Counter Billing & Taxation (`tran1`, `itran1`, `dtrn1`)

1. **Piece Selection**: Invoices explicitly bind to physical Tag Numbers (`TGNO` / `TSNO`).
2. **Component Pricing**:
   - Net Gold Value calculated using purity rate and wastage.
   - Making charges calculated based on gross weight, net weight, or piece count.
   - Diamond & stone charges itemized from tag breakdown.
3. **Old Gold Exchange**:
   - Supports customer old gold exchange directly on the bill (`BHAVWT`, `BHAVTUNCH`, `BHAVRATE`).
   - Net old gold value is credited against the invoice total.
4. **GST Compliance**:
   - Standard 3% Jewellery GST (CGST 1.5% + SGST 1.5% for intra-state; IGST 3% for inter-state).
5. **Invoice Statuses**:
   - `Draft`: Stock not deducted, tags remain available.
   - `Finalized`: Physical pieces marked sold, inventory decremented, accounting vouchers generated.
   - `Cancelled`: Restores tags to `in_stock`, restores product quantities, records `sales_return` inventory movement.

---

## 8. Approval / Jangad Memo (`APPROVAL`)

- Enables jewellery pieces to be sent to customers or retail partners on memo/approval.
- Tag status changes to `on_approval`.
- Approval voucher issued without booking sales revenue or deducting tax.
- Supports two resolution paths:
  1. **Return**: Item inspected and restored to showroom stock.
  2. **Sale**: Converted directly into a final GST Tax Invoice.

---

## 9. Customer Jewellery Repair Management (`REPAIR`)

- Intake of damaged jewellery from clients.
- Records original piece condition, incoming weight, missing stones, and repair instructions.
- Generates repair job order to Karigar.
- Tracks added metal weight / replacement stones and calculates repair labour for billing.

---

## 10. Savings Scheme / Kitty (`KITTY`)

- Monthly jewellery savings scheme (e.g., 11-month installment deposit with 12th month bonus).
- Tracks monthly payments, overdue installments, and redemption towards jewellery purchase on a sales invoice.

---

## 11. Statutory Reports & Compliance (`ITC04`, `GSTR1`)

- **ITC-04 Job Work Return**: Mandatory quarterly reporting of metal sent to Karigars, goods received back, and scrap generated.
- **GSTR-1 Report**: B2B and B2C sales summary with HSN code `7113`, taxable amounts, and tax breakups.
