# 12. EXISTING WORKFLOW MERMAID DIAGRAMS

**System:** Rudhra Jewellers ERP  
**Scope:** Complete Visual Workflow Architecture & State Machine  
**Diagrams Included:** 10 Independent Mermaid Workflows covering every functional lifecycle.

---

## 1. Product Creation & Catalog Blueprint Workflow

```mermaid
flowchart TD
    A["Admin / Inventory Manager"] --> B["Select Category & Subcategory"]
    B --> C["Load Dynamic form_schema"]
    C --> D["Enter Basic Metadata: Name, SKU, Design No"]
    D --> E["Specify Metal Specs: Purity 22K, Touch 91.6%, Stamp"]
    E --> F["Define Weights: Gross Wt, Net Gold Wt, Fine Wt"]
    F --> G["Define Components: Main Body, Clasp, Stones, Diamonds"]
    G --> H["Upload Images: Primary Thumbnail & Child Angles"]
    H --> I["Submit Form (POST /api/inventory)"]
    I --> J["InventoryController::store() Transaction"]
    J --> K["Create Record in products Table"]
    J --> L["Initialize Stock: opening_stock_qty & current_stock_qty"]
    K --> M["Sync to ProductDesign Catalog (ProductDesignController)"]
```

---

## 2. Raw Material Vault & Bullion Inventory Workflow

```mermaid
flowchart TD
    V_IN["Purchase Entry: Raw Metal (Gold/Silver)"] --> V_CREDIT["RawMaterial::creditPurchase()"]
    V_CREDIT --> V_BAL1["raw_materials.purchased_weight INCREMENTED"]
    V_BAL1 --> V_AVAIL1["raw_materials.current_balance INCREMENTED"]

    WO_NEW["New Work Order Created"] --> V_DEBIT["RawMaterial::debitAllocation()"]
    V_DEBIT --> V_ALLOC["raw_materials.allocated_weight INCREMENTED"]
    V_ALLOC --> V_AVAIL2["raw_materials.current_balance DECREMENTED"]
    
    note1["Negative Balance Allowed if Production precedes Purchase Voucher"] -.-> V_AVAIL2

    WO_COMP["Work Order Completed / Cancelled"] --> V_SYNC["RawMaterial::recalculateAllocations()"]
    V_SYNC --> V_RECALC["Re-sum Active Jobs -> Updates Allocated Weight"]
```

---

## 3. Job Creation, Customer Contract & Allocation Workflow

```mermaid
flowchart TD
    CL["Client Request / Custom Order"] --> JC_FORM["NewWorkOrder.jsx Form"]
    JC_FORM --> P_LOOKUP["Lookup Design No in products Catalog"]
    P_LOOKUP --> PREFILL["Pre-fill Name, Karat, Weights, Stones, Images"]
    PREFILL --> ASSIGN_K["Select Artisan (Karigar)"]
    ASSIGN_K --> ALLOT["Enter Allotted Gold Wt & Delivery Date"]
    ALLOT --> SUBMIT_WO["Submit (POST /api/work-orders)"]
    
    subgraph Transaction ["DB::transaction() in WorkOrderController::store"]
        SUBMIT_WO --> JO_CREATE["Create Parent JobOrder (JO-YYYY-XXXX)"]
        JO_CREATE --> WO_CREATE["Create Child WorkOrder (WO-YYYY-XXXX)"]
        WO_CREATE --> ITEMS_CREATE["Create Child work_order_items (1 row per job)"]
        ITEMS_CREATE --> TIME_INIT["Insert work_order_timelines ('created', 'assigned')"]
        TIME_INIT --> NOTIF_INIT["Insert work_order_notifications for Artisan"]
        NOTIF_INIT --> RM_DEBIT["RawMaterial::debitAllocation(totalGoldWeight)"]
        RM_DEBIT --> KG_SYNC["syncKarigarGoldBalance(karigar_id)"]
    end
    
    KG_SYNC --> DISPATCH["Work Order Dispatched to Workshop"]
```

---

## 4. Work in Progress (WIP) & Partial Production Workflow

```mermaid
flowchart TD
    WO_ACT["Active Work Order in Workshop"] --> WIP_FORM["WorkInProgress.jsx"]
    WIP_FORM --> INPUT_QTY["Enter Completed Now Qty (e.g. 2 of 10)"]
    INPUT_QTY --> INPUT_WT["Enter Scale Weight & Recovered Scrap"]
    
    INPUT_WT --> CHK_DELAY{"Is Production Delayed?"}
    CHK_DELAY -- Yes --> SET_DELAY["Set is_delayed=1, Reason, Days, New Date"]
    SET_DELAY --> POST_WIP["POST /api/work-orders/:id/wip-update"]
    CHK_DELAY -- No --> POST_WIP
    
    subgraph Execution ["WorkOrderController::wipUpdate"]
        POST_WIP --> CHK_REW{"Any Rework Pending?"}
        CHK_REW -- Yes --> CLR_REW["Clear rework_qty first (No duplicates)"]
        CLR_REW --> INC_COMP["Increment completed_qty & qc_pending_qty"]
        CHK_REW -- No --> INC_COMP
        INC_COMP --> INC_WT["Increment completed_weight, Decrement pending_weight"]
        INC_WT --> CHK_STAGE{"All Units Completed?"}
        CHK_STAGE -- Yes --> STG_QC["current_stage = 'quality_check'"]
        CHK_STAGE -- No --> STG_WIP["current_stage = 'work_in_progress'"]
        STG_QC --> AUDIT_WIP["Insert work_order_timelines record"]
        STG_WIP --> AUDIT_WIP
    end
    
    AUDIT_WIP --> QC_QUEUE["Completed Units Queued for Inspection"]
```

---

## 5. Quality Check (QC), Tolerance & Rework Loop

```mermaid
flowchart TD
    QC_QUEUE["Units in QC Queue (qc_pending_qty > 0)"] --> QC_PAGE["QualityCheckDetails.jsx"]
    QC_PAGE --> INSPECT["Inspect Dimensions, Weights, Stones, Finish"]
    
    INSPECT --> DECISION{"Inspector Decision"}
    
    DECISION -- Pass All --> PASS["qcAction: action = 'pass'"]
    PASS --> P_LOG["qc_approved_qty += pass<br/>ready_qty += pass<br/>qc_pending_qty -= pass"]
    P_LOG --> STG_RDY["current_stage = 'ready'<br/>status = 'ready'"]
    
    DECISION -- Reject All --> REWORK["qcAction: action = 'rework'"]
    REWORK --> R_LOG["rework_qty += rework<br/>return_count += 1<br/>qc_pending_qty -= rework"]
    R_LOG --> STG_REW["current_stage = 'rework'<br/>status = 'returned'"]
    STG_REW --> RET_SHOP["Returned to Artisan for Correction"]
    RET_SHOP --> WIP_FORM["Artisan corrects & resubmits via WIP"]
    
    DECISION -- Partial --> PARTIAL["qcAction: action = 'partial'"]
    PARTIAL --> SPLIT["Pass portion -> ready_qty<br/>Rework portion -> rework_qty"]
    SPLIT --> STG_RDY
```

---

## 6. Physical Piece Receiving & Barcode Tag Assignment

```mermaid
flowchart TD
    READY_UNITS["Units in Ready Stage (ready_qty > received_qty)"] --> RCV_PAGE["ReceiverWork.jsx"]
    RCV_PAGE --> FETCH_WO["Select Work Order / Fetch WO Number"]
    FETCH_WO --> WEIGH_PIECE["Weigh Individual Physical Piece on Scale"]
    
    WEIGH_PIECE --> ENTER_DATA["Enter Gross Wt, Old Wt, Diamond Wt, Stone Wt"]
    ENTER_DATA --> LIVE_CALC["Live Math:<br/>Net Gold = Gross - Stones - Old<br/>Pure 24K = (Net Gold * Touch) / 100<br/>Total MC = Gross Wt * MC Rate"]
    
    LIVE_CALC --> SUBMIT_RCV["Click [ Receive 1 Piece & Generate Tag ]"]
    
    subgraph RcvTransaction ["DB::transaction() in WorkOrderController::receivePiece"]
        SUBMIT_RCV --> GEN_RWO["Generate RWO-YYYY-XXXXXX"]
        GEN_RWO --> GEN_TAG["Generate TAG-YYYY-XXXXXX"]
        GEN_TAG --> INSERT_PIECE["Create work_order_received_pieces record<br/>(is_inventory_posted = false)"]
        INSERT_PIECE --> INC_RCV["Increment work_orders.received_qty += 1"]
        INC_RCV --> KG_BENCH["syncKarigarGoldBalance(karigar_id) (Relieves Liability)"]
        KG_BENCH --> CHECK_POST["Trigger syncInventoryPosting(order)"]
    end
    
    CHECK_POST --> PRINT_MODAL["Open Tag Preview & Direct Thermal Print"]
```

---

## 7. Certification & BIS Hallmarking Compliance Gate

```mermaid
flowchart TD
    RCV_DONE["Physical Piece Received (is_inventory_posted = false)"] --> CERT_GATE{"Diamond / Studded Article?"}
    
    CERT_GATE -- Yes --> CERT_PAGE["CertificationDetails.jsx"]
    CERT_PAGE --> ACT_CERT{"Record Certificate or Skip?"}
    ACT_CERT -- Add --> C_ADD["Save cert_no (IGI/GIA) -> certification_status = 'completed'"]
    ACT_CERT -- Skip --> C_SKIP["Explicit Skip -> certification_status = 'skipped'"]
    
    CERT_GATE -- No --> C_SKIP
    
    C_ADD --> HALL_PAGE["HallmarkingDetails.jsx"]
    C_SKIP --> HALL_PAGE
    
    HALL_PAGE --> ACT_HALL{"Record BIS Hallmark or Skip?"}
    ACT_HALL -- Add --> H_ADD["Save 6-char HUID -> hallmarking_status = 'completed'"]
    ACT_HALL -- Skip --> H_SKIP["Explicit Skip -> hallmarking_status = 'skipped'"]
    
    H_ADD --> GATE_PASSED["Compliance Gate Satisfied"]
    H_SKIP --> GATE_PASSED
    
    GATE_PASSED --> AUTO_POST["Trigger syncInventoryPosting(order)"]
```

---

## 8. Final Inventory Posting & Product Aggregation Workflow

```mermaid
flowchart TD
    AUTO_POST["syncInventoryPosting(WorkOrder $order)"] --> FETCH_UNPOSTED["Select unposted pieces where is_inventory_posted = false"]
    
    FETCH_UNPOSTED --> CHK_ELIG{"QC Approved AND<br/>Cert Satisfied AND<br/>Hallmark Satisfied?"}
    
    CHK_ELIG -- No --> HOLD["Return 0 (Hold pieces in Staging)"]
    
    CHK_ELIG -- Yes --> LOOP_PIECES["Loop through each physical piece"]
    
    subgraph SingleMaster ["Single-Master Aggregation Loop"]
        LOOP_PIECES --> FIND_PROD["Find Product by design_no in products table"]
        FIND_PROD -- Exists --> UPDATE_PROD["products.current_stock_qty += 1<br/>products.opening_stock_weight += gross_wt<br/>products.opening_fine_weight += pure_24k_wt"]
        FIND_PROD -- Does Not Exist --> CREATE_PROD["Product::create([...]) (Master initialized)"]
        
        UPDATE_PROD --> LINK_PC["piece.product_id = product.id"]
        CREATE_PROD --> LINK_PC
        
        LINK_PC --> LOG_MOV["Insert inventory_movements ('receipt', +1, gross_wt)"]
        LOG_MOV --> FLAG_PC["piece.is_inventory_posted = true<br/>piece.posted_at = now()"]
    end
    
    FLAG_PC --> SUM_POSTED["Update work_orders.finalized_qty"]
    SUM_POSTED --> CHK_ALL{"finalized_qty >= required_qty?"}
    CHK_ALL -- Yes --> WO_DONE["work_orders.status = 'completed'<br/>current_stage = 'completed'"]
    CHK_ALL -- No --> WO_PART["work_orders.status = 'partially_received'"]
```

---

## 9. Customer Sales (POS) & Stock Decrement Workflow

```mermaid
flowchart TD
    STORE["Customer in Showroom / Wholesale Billing"] --> POS["SalesModule / Billing"]
    POS --> SCAN_TAG["Scan Product SKU / Tag Number"]
    SCAN_TAG --> CHK_STK{"Product current_stock_qty > 0?"}
    
    CHK_STK -- No --> ERR_STK["Throw ValidationException: Insufficient stock"]
    
    CHK_STK -- Yes --> BILL_ITEM["Calculate Line Total: Rate + Making + Gems + GST"]
    BILL_ITEM --> PAY["Capture Payment: Cash, Bank Transfer, Metal Swap"]
    PAY --> SUBMIT_SALE["SaleService::create(payload)"]
    
    subgraph SaleTx ["DB::transaction() in SaleService"]
        SUBMIT_SALE --> CREATE_INV["Create Invoice in invoices table"]
        CREATE_INV --> CREATE_LINES["Create Line Items in sale_items table"]
        CREATE_LINES --> DEC_PROD["product->decrement('current_stock_qty', quantity)"]
        DEC_PROD --> LOG_SALE_MOV["Insert inventory_movements ('sale', -quantity, -weight)"]
        LOG_SALE_MOV --> CREATE_PAY["Create SalePayment in sale_payments table"]
        CREATE_PAY --> UPD_CLIENT["Increment client->total_purchases"]
    end
    
    UPD_CLIENT --> PRINT_INV["Generate GST Tax Invoice Bill"]
```

---

## 10. Master End-to-End Enterprise Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Showroom
    actor Manager as Workshop Manager
    actor Artisan as Karigar (Artisan)
    actor Inspector as QC Inspector
    actor Receiver as Receiving Desk
    participant ERP as Rudhra ERP Core
    participant Vault as Raw Material Vault
    participant Catalog as Product Catalog

    Customer->>Manager: 1. Place Custom Jewellery Order (JO-2026-0001)
    Manager->>ERP: 2. Create Work Order & Allot Bullion (WO-2026-0001)
    ERP->>Vault: 3. Debit Bullion Vault (RawMaterial::debitAllocation)
    ERP->>Artisan: 4. Dispatch Job & Log Bench Gold Liability
    Artisan->>Manager: 5. Handcraft Jewellery & Deliver Finished Pieces
    Manager->>ERP: 6. Record Partial Production (wipUpdate) -> Queue to QC
    Inspector->>ERP: 7. Inspect Pieces & Approve (qcAction: Pass 100%)
    ERP->>Receiver: 8. Pieces Move to Ready Queue (ready_qty > 0)
    Receiver->>ERP: 9. Weigh & Physically Receive (receivePiece)
    ERP-->>Receiver: 10. Generate RWO-2026-000001 & TAG-2026-000001
    Receiver->>Artisan: 11. Relieve Artisan Gold Bench Liability (syncKarigarGoldBalance)
    Receiver->>ERP: 12. Complete BIS HUID & Diamond Certification
    ERP->>Catalog: 13. Finalize Inventory Posting (syncInventoryPosting)
    Note over ERP,Catalog: Increments single Product Master current_stock_qty & logs movement
    Customer->>ERP: 14. Purchase Jewellery via POS (SaleService::create)
    ERP->>Catalog: 15. Decrement current_stock_qty & Issue Invoice
```
