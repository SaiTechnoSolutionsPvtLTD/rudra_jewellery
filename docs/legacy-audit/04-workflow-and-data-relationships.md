# Operational Workflows & Entity Relationships

**Project**: Rudra Jewellery ERP  
**Analysis Base**: Legacy Visual FoxPro Codebase & Modern Laravel/React Implementation

---

## 1. End-to-End Jewellery Operational Workflow

The following Mermaid diagram maps the complete path of business data from initial customer order/design through production, hallmarking, tagging, showroom inventory, point-of-sale invoicing, and reversal:

```mermaid
flowchart TD
    subgraph S1["1. Inception & Booking"]
        A1["Customer Custom Order (ord1)"] --> B1["Work Order Generation (jobmast)"]
        A2["Showroom Stock Plan"] --> B1
        A3["Advance Payment / Old Gold Exchange"] -.-> A1
    end

    subgraph S2["2. Manufacturing & Karigar Issue"]
        B1 --> C1["Raw Material Vault Allocation"]
        C1 --> C2["Gold/Alloy Issue to Karigar (gissue1)"]
        C2 --> C3["Production Stages (Melting, Casting, Filing, Setting, Polishing)"]
    end

    subgraph S3["3. Receiving & Quality Control"]
        C3 --> D1["Physical Piece Receiving (grcpt1)"]
        D1 --> D2{"QC Inspection"}
        D2 -- "Defect Detected" --> D3["Rework / Repair Job"]
        D3 --> C3
        D2 -- "Approved" --> E1["Scrap & Wastage Reconciliation (wtran1)"]
    end

    subgraph S4["4. Compliance & Tagging"]
        E1 --> F1{"Hallmark / Cert Required?"}
        F1 -- "Yes" --> F2["BIS Hallmarking Center (HUID) & Gem Lab (labmast)"]
        F1 -- "No / Skipped" --> F3["Tag Generation (tgm1 / tgd1)"]
        F2 --> F3
        F3 --> G1["Showroom Finished Inventory (In Stock)"]
    end

    subgraph S5["5. Sales, Approval & Delivery"]
        G1 --> H1{"Transaction Type"}
        H1 -- "Approval / Jangad" --> H2["Approval Memo Voucher (on_approval)"]
        H2 -- "Customer Rejects" --> G1
        H2 -- "Customer Accepts" --> I1["Sales Tax Invoice (tran1 / itran1)"]
        H1 -- "Direct Counter Sale" --> I1
    end

    subgraph S6["6. Settlement & Reversals"]
        I1 --> J1["Multi-Mode Payment (Cash, Bank, Card, Old Gold)"]
        J1 --> J2["Tag Marked 'sold', Stock Deducted, A4 Invoice Printed"]
        J2 -. "Cancellation Requested" .-> K1["Invoice Cancel / Return (sales_return)"]
        K1 --> G1
    end
```

---

## 2. Karigar Metal Reconciliation Workflow

```mermaid
flowchart LR
    A["Raw Material Vault"] -->|"Issue Pure Gold + Alloy (gissue1)"| B["Karigar Active Balance"]
    B -->|"Fabricate Jewellery"| C["Production Loss & Wastage"]
    B -->|"Receive Finished Pieces (grcpt1)"| D["Workshop Inward"]
    B -->|"Receive Scrap & Dust (Ghat)"| D
    D --> E{"Reconcile Metal (KHISAB)"}
    E -->|"Discrepancy < Allowed"| F["Karigar Efficiency Bonus"]
    E -->|"Discrepancy > Allowed"| G["Karigar Metal Recovery (Debit Ledger)"]
    E -->|"Discrepancy == Allowed"| H["Settlement Complete"]
```

---

## 3. Approval / Jangad Memo Workflow

```mermaid
flowchart TD
    A["Showroom Finished Inventory (in_stock)"] -->|"Issue Approval Voucher"| B["Piece Status: on_approval"]
    B -->|"Customer Evaluation Period"| C{"Client Decision"}
    C -- "Returned" --> D["Physical Verification & QC"]
    D -->|"Restore to Inventory"| A
    C -- "Purchased" --> E["Convert to Sales Tax Invoice"]
    E -->|"Lock Tag as sold"| F["Deduct Inventory & Issue GST Bill"]
```

---

## 4. Entity Relationship Diagram (Core ERP Architecture)

```mermaid
erDiagram
    CLIENT ||--o{ CUSTOMER_ORDER : places
    CLIENT ||--o{ INVOICE : billed_to
    CLIENT ||--o{ APPROVAL_MEMO : receives
    
    CUSTOMER_ORDER ||--o{ WORK_ORDER : initiates
    
    KARIGAR ||--o{ WORK_ORDER : assigned_to
    KARIGAR ||--o{ KARIGAR_TRANSACTION : settles
    
    RAW_MATERIAL ||--o{ KARIGAR_TRANSACTION : issued_as
    
    WORK_ORDER ||--o{ WORK_ORDER_PIECE : produces
    
    PRODUCT ||--o{ WORK_ORDER_PIECE : catalogs
    PRODUCT ||--o{ INVENTORY_MOVEMENT : tracks
    
    WORK_ORDER_PIECE ||--o{ TAG_DETAIL : possesses
    WORK_ORDER_PIECE ||--o| SALE_ITEM : invoiced_in
    
    INVOICE ||--o{ SALE_ITEM : contains
    INVOICE ||--o{ SALE_PAYMENT : collects
    INVOICE ||--o{ OLD_GOLD_INTAKE : credits
```
