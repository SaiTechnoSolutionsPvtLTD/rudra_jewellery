# 14. STRATEGIC BUSINESS QUESTIONS FOR RUDRA JEWELLERS STAKEHOLDERS

**Target Audience:** Managing Director, Workshop Master, Head of Accounts & Store Manager  
**Purpose:** Align software implementation with official business accounting and operational rules before developing the new ERP.

---

## Question 1: Customer Old Gold — Physical Weight vs. Financial Payment
**Context:** In the current receiving formula:
$$\text{Net Gold Weight} = \text{Gross Weight} - (\text{Stones} \times 0.2) - \mathbf{\text{Old Weight}}$$
Deducting old weight decreases the recorded gold content of the finished piece in catalog inventory.  
**Questions for Business:**
1. Does "Old Weight" entered during receiving represent **scrap metal returned by the artisan**, or **old gold traded in by the customer**?
2. If it is customer trade-in gold, shouldn't the physical finished jewellery piece retain its true gross/net weight in inventory, while the old gold is recorded in the customer ledger as a billing credit?

---

## Question 2: Artisan Wastage (Process Loss) Settlement Policy
**Context:** When a Karigar is issued 50.000g of gold and delivers a piece of 47.000g with 1.500g scrap returned, the unaccounted loss is 1.500g ($3.00\%$).  
**Questions for Business:**
1. If actual process loss exceeds `wastage_allowed_percent`, how should the excess loss be settled?
   - Deducted from the artisan's making charge payment?
   - Added as a physical metal debit on the artisan's bench balance?
   - Absorbed by the store as allowable operational loss?
2. How frequently are Karigar metal accounts audited and physically reconciled?

---

## Question 3: Making Charge Calculation Standard
**Context:** In the existing software, making charges can be calculated on **Gross Weight**, **Net Gold Weight**, as a **Percentage of Metal Value**, or as a **Fixed Rupee Amount**.  
**Questions for Business:**
1. What is the standard agreement with your workshop artisans? Is labor always paid on **Gross Weight** (total handling weight) or **Net Gold Weight**?
2. Do studded diamond jewelry items carry separate setting charges per diamond piece/carat in addition to the metal fabrication charge?

---

## Question 4: Independent Artisan Workshop Portal
**Context:** The current software has artisan logins hardcoded to disabled (`isKarigar = false`), meaning store supervisors record all workshop progress on behalf of the artisans.  
**Questions for Business:**
1. Do you want artisans to have their own simplified mobile interface (via mobile number/OTP) to view assigned work orders, accept jobs, and log daily completion?
2. Or should the software remain strictly an internal supervisor-operated management console?

---

## Question 5: Gemstone & Diamond Vault Inventory
**Context:** The existing system debits Gold, Silver, and Platinum from the `raw_materials` vault, but prohibits company allocation of loose colour stones (`WorkOrderController:320`).  
**Questions for Business:**
1. Does Rudhra Jewellers maintain a physical vault of loose diamonds (by sieve/carat ranges) and precious stones (rubies, emeralds)?
2. Should the new ERP track bulk diamond packet procurement, issuing stones to artisans per job, and recovering unset stones into a gemstone inventory vault?

---

## Question 6: Compliance Gating for Ready Stock
**Context:** Currently, physical pieces cannot be finalized into showroom stock until Certification and BIS Hallmarking are marked either `completed` or `skipped`.  
**Questions for Business:**
1. Can plain 22K gold jewellery be displayed and sold in the showroom before BIS HUID hallmarking is finalized, or is HUID strictly mandatory prior to catalog posting?
2. Are diamond certificates issued in-house or by external laboratories (IGI / GIA / SGL)?
