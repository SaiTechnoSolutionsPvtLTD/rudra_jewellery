# 11. COMPLETE UI FIELD DICTIONARY & MASTER INPUT MATRIX

**System:** Rudhra Jewellers ERP  
**Scope:** Exhaustive Field-by-Field Inventory of all 18 Manufacturing & Inventory Screens  
**Structure:** Standardized audit matrix identifying exact labels, types, validation, sources, formulas, database destinations, and downstream consumption.

---

## Screen 1: Master Inventory (`InventoryDashboard.jsx` & `Masters`)

| Field Label | Type | Required? | Editable? | Source table.column | Formula / Unit | Saved to | Next-stage usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Category Name | Text | Yes | Yes | `categories.name` | Text | `categories.name` | Groups products & determines form schema. |
| Category Code | Text | Yes | Yes | `categories.code` | Alphanumeric (e.g. `JWL`) | `categories.code` | Prefixes SKU / barcode generation. |
| Subcategory Name | Text | Yes | Yes | `subcategories.name`| Text | `subcategories.name` | Refines product classification. |
| Karat Purity % | Decimal | Yes | Yes | `karats.purity_percentage`| % (e.g. `91.60`) | `karats.purity_percentage`| Pure 24K gold calculations. |
| Stamp Code | Text | Yes | Yes | `stamps.name` | Text (e.g. `916 BIS`, `+0`)| `stamps.name` | Stamped on jewellery tags. |
| Applicable Material| Dropdown | Yes | Yes | `stamps.applicable_for`| `Gold`, `Diamond`, `Stone` | `stamps.applicable_for`| Filters stamps per material category. |
| Diamond Sieve Size | Text | Yes | Yes | `diamond_ranges.sieve_size`| Text (e.g. `+2-6.5`) | `diamond_ranges.sieve_size`| Sieve grading in stone setting. |
| Rate per Carat | Decimal | Yes | Yes | `diamond_ranges.rate_per_carat`| ₹ / Ct | `diamond_ranges.rate_per_carat`| Valuation of melee diamonds. |

---

## Screen 2: Product Add (`InventoryAddNewUpload.jsx`)

| Field Label | Type | Required? | Editable? | Source table.column | Formula / Unit | Saved to | Next-stage usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Category | Dropdown | Yes | Yes | `categories.name` | Foreign Key | `products.category_id` | Loads dynamic form schema. |
| Subcategory | Dropdown | Yes | Yes | `subcategories.name` | Foreign Key | `products.subcategory_id` | Refines dynamic fields. |
| Product Name | Text | Yes | Yes | User input | Text | `products.name` | Display label across catalog & bills. |
| Product Code / SKU | Text | Yes | Yes | Auto-generated | `RJ-[RAND]-[NUM]` | `products.product_code` | Primary catalog lookup key. |
| Design Number | Text | No | Yes | User / Auto | `DES-XXXX` | `products.design_no` | CAD blueprint & work order link. |
| Gross Weight | Decimal | Yes | Yes | Scale reading | Grams (3 decimals) | `products.opening_stock_weight`| Baseline finished gross weight. |
| Net Gold Weight | Decimal | Yes | Yes | Scale reading | Grams (3 decimals) | `products.opening_fine_weight` | Net metal excluding gems. |
| Gold Karat / Purity| Dropdown | Yes | Yes | `karats.name` | `22K`, `18K`, `24K` | `attributes->purity` | Hallmark stamp specification. |
| Touch (%) | Decimal | Yes | Yes | `karats.purity_percentage`| `91.60%` | `products.opening_touch` | Calculation of pure gold equivalent. |
| Stamp | Dropdown | No | Yes | `stamps.name` | `+0`, `916 BIS` | `attributes->stamp` | Thermal tag stamp display. |
| Initial Stock Qty | Number | Yes | Yes | User input | Units (integer) | `products.current_stock_qty` | Immediate showroom stock balance. |
| Diamond Carats | Decimal | No | Yes | User input | Carats (Ct) | `attributes->dia_wt_ct` | Tag spec & valuation. |
| Diamond Count | Number | No | Yes | User input | Count (integer) | `attributes->diamond_count` | Tag spec & stone audit. |
| Making Charge | Decimal | No | Yes | User input | ₹ / gram | `attributes->making_charge` | Default artisan labor rate. |
| Primary Image | File | No | Yes | Upload / Camera | Image file URL | `products.image` | Catalog & work order reference visual. |

---

## Screen 3: Product Catalog (`InventoryDashboard.jsx`)

| Field Label | Type | Required? | Editable? | Source table.column | Formula / Unit | Saved to | Next-stage usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Thumbnail | Image | Readonly | No | `products.image` | Asset URL | N/A | Visual identification. |
| Product Title | Text | Readonly | No | `products.name` | Text | N/A | Catalog search & selection. |
| SKU / Code | Text | Readonly | No | `products.product_code` | Monospace code | N/A | Barcode scanning. |
| Design No | Text | Readonly | No | `products.design_no` | Uppercase string | N/A | Job order generation link. |
| Available Stock | Badge | Readonly | No | `products.current_stock_qty`| Units (`In Stock`, `Out of Stock`)| N/A | Determines sales availability. |
| Gross Weight | Text | Readonly | No | `products.opening_stock_weight`| Grams (3 decimals) | N/A | Stock inventory valuation. |
| Purity | Badge | Readonly | No | `attributes->purity` | `22K (916)` | N/A | Quality assurance display. |

---

## Screen 4: Raw Material Stock Management (`StockManagement.jsx`)

| Field Label | Type | Required? | Editable? | Source table.column | Formula / Unit | Saved to | Next-stage usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Material Type | Text | Readonly | No | `raw_materials.material_type`| `gold`, `silver`, `diamond`| N/A | Material bucket classification. |
| Total Purchased Wt | Decimal | Readonly | No | `raw_materials.purchased_weight`| kg / grams / ct | N/A | Cumulative procurement tracking. |
| Active Allocated Wt | Decimal | Readonly | No | `raw_materials.allocated_weight`| Live sum of active jobs | N/A | Bullion currently locked in workshop. |
| Current Available Bal| Decimal | Readonly | No | `raw_materials.current_balance`| `purchased - allocated` | N/A | Real-time bullion available for new jobs. |

---

## Screen 5: Job Creation / Work Order Creation (`NewWorkOrder.jsx`)

| Field Label | Type | Required? | Editable? | Source table.column | Formula / Unit | Saved to | Next-stage usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Parent Job Order No| Text | No (Auto) | No | `job_orders.job_order_number`| `JO-YYYY-XXXX` | `job_orders.job_order_number`| Parent commercial contract. |
| Work Order No | Text | No (Auto) | No | `work_orders.work_order_number`| `WO-YYYY-XXXX` | `work_orders.work_order_number`| Workshop voucher key. |
| Customer / Client | Dropdown | Yes | Yes | `clients.name` | Foreign Key | `work_orders.client_id` | Billing & notifications. |
| Artisan (Karigar) | Dropdown | Yes | Yes | `karigars.name` | Foreign Key | `work_orders.karigar_id` | Karigar bench liability tracking. |
| Metal Purity | Dropdown | Yes | Yes | `gold_types.name` | `Gold 22K (916)` | `work_orders.material_type` | Metal vault debit bucket. |
| Planned Quantity | Number | Yes | Yes | User input | Units (integer) | `work_orders.required_qty` | Target production quantity. |
| Allotted Metal Wt | Decimal | Yes | Yes | Scale / Estimate | Grams (3 decimals) | `work_orders.allotted_weight` | Debits bullion vault & Karigar balance. |
| Allotted Date | Date | Yes | Yes | Current date | `YYYY-MM-DD` | `work_orders.allotted_date` | Benchmark for SLA / delay metrics. |
| Promised Delivery | Date | Yes | Yes | User entered | `YYYY-MM-DD` | `work_orders.delivery_date` | Deadline for workshop completion. |
| Allowed Wastage % | Decimal | No | Yes | `karigars.standard_wastage`| % (e.g. `3.50%`) | `work_orders.wastage_allowed_percent`| Maximum allowable process loss. |
| Making Charge Rate | Decimal | Yes | Yes | Karigar standard | ₹ / gram | `work_orders.making_charge_per_gram`| Artisan payment rate. |

---

## Screen 6: Work in Progress Execution (`WorkInProgress.jsx`)

| Field Label | Type | Required? | Editable? | Source table.column | Formula / Unit | Saved to | Next-stage usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Completed Now (Qty)| Number | Yes | Yes | User input | Units (`max: pending_production`)| `completed_qty` & `qc_pending_qty` | Pushes completed pieces into QC queue. |
| Actual Completed Wt| Decimal | Yes | Yes | Scale reading | Grams (3 decimals) | `work_orders.completed_weight` | Decrements pending bench gold liability. |
| Old Gold / Scrap Wt| Decimal | No | Yes | Scale reading | Grams | `pricing_details['old_weight']` | Scrap recovered from workshop. |
| Stones / Gems Wt | Decimal | No | Yes | Scale reading | Carats / Grams | `pricing_details['stone_weight']`| Gemstones mounted into piece. |
| Delay Production? | Checkbox | No | Yes | User toggle | Boolean | `work_orders.is_delayed` | Flags job for Delay Management. |
| Delay Reason | Dropdown | If delayed | Yes | Predefined list | Categorical reason | `work_orders.delay_reason` | Delay analytics & reporting. |
| Delay Days | Number | If delayed | Yes | User entered | Days (integer) | `work_orders.delay_days` | Extends promised delivery date. |
| New Delivery Date | Date | If delayed | Yes | Calculated / selected | `YYYY-MM-DD` | `work_orders.delivery_date` | Postpones deadline. |

---

## Screen 7: Quality Check Inspection (`QualityCheckDetails.jsx`)

| Field Label | Type | Required? | Editable? | Source table.column | Formula / Unit | Saved to | Next-stage usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Inspection Action | Radio | Yes | Yes | User selection | `pass`, `rework`, `partial` | State routing | Directs items to Ready vs Workshop. |
| Approved Qty | Number | If passing | Yes | User input | Units (integer) | `qc_approved_qty` & `ready_qty`| Unlocks pieces for Physical Receiving. |
| Rework Qty | Number | If rework | Yes | User input | Units (integer) | `rework_qty` & `return_count` | Locks pieces in workshop for re-crafting. |
| Rework Reason | Textarea | If rework | Yes | User input | Text | `work_orders.return_reason`| Informs artisan of physical defects. |
| Inspector Remarks | Textarea | No | Yes | User input | Text | `work_orders.quality_notes`| Permanent quality compliance audit. |

---

## Screen 8: Physical Piece Receiving (`ReceiverWork.jsx`)

| Field Label | Type | Required? | Editable? | Source table.column | Formula / Unit | Saved to | Next-stage usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Receive Order No | Display | Readonly | No | Auto-generated | `RWO-YYYY-XXXXXX` | `receive_order_number` | Formal intake voucher number. |
| Tag Number | Display | Readonly | No | Auto-generated | `TAG-YYYY-XXXXXX` | `tag_number` | Thermal barcode label printed on piece. |
| Piece Sequence | Display | Readonly | No | Counter | Piece #N | `piece_number` | Sequence under this work order. |
| Gross Weight | Decimal | Yes | Yes | Scale reading | Grams (3 decimals) | `gross_weight` | Physical scale weight of finished piece. |
| Old Weight | Decimal | No | Yes | Scale reading | Grams (3 decimals) | `old_weight` | Recovered scrap deduction. |
| Diamond Weight (Ct)| Decimal | No | Yes | Scale reading | Carats (3 decimals) | `diamond_weight` | Converted via `0.2g` in Net Gold calc. |
| Diamond Count | Number | No | Yes | Dynamic from prod | Units (integer) | `diamond_count` | Printed on tag (`Dia-wt/+stamp/count`). |
| Diamond Stamp | Text | No | Yes | Dynamic from prod | String (`+0`, `+7`, `7U`)| Parsed in `diamond_details` | Dynamic stamp printed on thermal tag. |
| Net Gold Weight | Decimal | Live Calc | No | Formula | `Gross - (Dia*0.2) - (Stone*0.2) - Old`| `net_gold_weight` | Pure gold alloy weight in piece. |
| Touch (Purity %) | Decimal | Yes | Yes | `91.60` | % (e.g. `91.60`) | `purity` | Metallurgical touch assay. |
| Pure 24K Weight | Decimal | Live Calc | No | Formula | `(Net Gold * Touch) / 100` | `pure_24k_weight` | 24K pure bullion equivalent. |
| Making Charge Rate | Decimal | Yes | Yes | Karigar rate | ₹ / gram | `making_charge_per_gram`| Unit artisan labor remuneration. |
| Total Making Charge| Decimal | Live Calc | No | Formula | `Gross Wt * MC Rate` | `total_making_charge` | Payable labor remuneration. |
| HUID Code | Text | No | Yes | User entered | 6-char alphanumeric | `huid` | BIS Hallmark tracking identifier. |
| Certificate No | Text | No | Yes | User entered | Certificate string | `certificate_no` | Diamond / Gemstone certificate ref. |

---

## Screen 9: Thermal Jewellery Tag (`JewelleryTagCard.jsx`)

| Tag Display Element | Type | Source Data | Layout Position | Rendering Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Gross Weight** | Text | `piece.gross_weight` | Left Panel (Top Left) | `G.Wt -{grossWeight}` (Bold, 15px) |
| **Design Number** | Text | `piece.design_no` | Left Panel (Top Right) & Right Panel (Bottom)| Bold uppercase text (`D001`) |
| **Diamond Specification**| Text | `formatTagDiamondSpec(piece)`| Left Panel (Middle Left) | `Dia-{wt}/+{stamp}/{count}` (e.g. `Dia-0.00/+0/0`) |
| **Gold Karat** | Text | `piece.gold_karat` | Left Panel (Middle Right)| Bold text (`22K`, `18K`) |
| **Total Diamond Carats** | Text | `formatTagTotalDia(piece)` | Left Panel (Bottom Right) & Right Panel (Middle) | `T.Dia- {totalDia}Ct.` |
| **Barcode SVG** | Vector SVG | `generateBarcodeSvgString(tagNo)`| Right Panel (Top) | Real-time SVG barcode strip seeded from Tag Number |
| **Tag Number** | Monospace | `piece.tag_number` | Right Panel (Directly Below Barcode) | Monospace bold text (`TAG-2026-000003`) |
