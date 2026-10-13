# 02. MASTER INVENTORY & PRODUCT CREATION DEEP ANALYSIS

**System:** Rudhra Jewellers ERP  
**Scope:** Master Inventory, Product Add, Product Catalog, Components, Attributes, and Master Tables.  
**Evidence Source:** Confirmed from migrations, Eloquent models, controllers (`InventoryController`, `ProductController`, `ProductDesignController`), and React UI components (`InventoryAddNewUpload.jsx`, `InventoryEditProduct.jsx`, `CreateProduct.jsx`).

---

## 1. Master Inventory Architecture & Master Entities

Master inventory in Rudhra Jewellers is split into two architectural layers:
1. **Core Relational Master Tables:** Relational tables providing standardized options (Karats, Stamps, Units, Gold Types, Categories, Subcategories, Diamond Colors, Clarities, Ranges, Setting Styles, Component Categories).
2. **Hybrid Product Catalog:** The `products` table stores fixed relational metadata (foreign keys to categories/subcategories, names, codes, stocks) and an extensible JSON `attributes` column holding domain-specific jewelry specifications.

### Relational Master Data Dictionary

| Master Entity | Table Name | Key Columns | Primary Purpose in System |
| :--- | :--- | :--- | :--- |
| **Categories** | `categories` | `id`, `name`, `code`, `form_schema`, `status` | Major jewelry categories (Gold, Diamond, Silver, Platinum, Gift Articles). |
| **Subcategories** | `subcategories` | `id`, `category_id`, `name`, `code`, `form_schema`, `status` | Specific ornaments (Bangles, Rings, Necklaces, Chokers, Chains, Pendants). |
| **Karats** | `karats` | `id`, `name`, `code`, `purity_percentage` | Purity definitions (e.g. 24K - 99.9%, 22K - 91.6%, 18K - 75.0%, 14K - 58.5%). |
| **Stamps** | `stamps` | `id`, `name`, `applicable_for`, `status` | Physical purity hallmarking stamps (`+7`, `+0`, `916 BIS`, `750 BIS`). |
| **Units** | `units` | `id`, `name`, `code`, `symbol` | Standard measurement units (Grams - `g`, Carats - `ct`, Pieces - `pcs`, Kilograms - `kg`). |
| **Gold Types** | `gold_types` | `id`, `name`, `karat_id`, `color` | Metal color & alloy type (Yellow Gold, White Gold, Rose Gold, Two-Tone). |
| **Diamond Ranges** | `diamond_ranges` | `id`, `from_carat`, `to_carat`, `sieve_size`, `rate_per_carat` | Sieve sizes and valuation tiers for small diamonds (melee/pointers). |
| **Diamond Colors** | `diamond_colors` | `id`, `name`, `code`, `grade` | Color grading scale (D, E, F, G, H, I, J, Fancy). |
| **Diamond Clarities**| `diamond_clarities`| `id`, `name`, `code`, `grade` | Clarity grading scale (FL, IF, VVS1, VVS2, VS1, VS2, SI1, I1). |
| **Setting Styles** | `styles` | `id`, `name` | Stone setting methods (Prong, Pave, Bezel, Channel, Tension, Pressure). |
| **Component Categories**| `component_categories`| `id`, `name`, `code` | Categorization for modular jewelry parts (Lock, Hook, Main Body, Screw, Chain). |

---

## 2. Dynamic Form Schema System (`form_schema`)

The migration `2026_08_22_000011_add_form_schema_to_categories_and_subcategories.php` introduced dynamic `form_schema` JSON columns in both `categories` and `subcategories`.
- **Purpose:** Allows administrators to configure dynamic fields per category (e.g. Bangles require `size` and `open_close_type`; Rings require `ring_size`; Necklaces require `hook_type` and `length`).
- **Storage:** When a user selects a category and subcategory in `InventoryAddNewUpload.jsx`, the frontend reads `category.form_schema` and `subcategory.form_schema` to dynamically render category-specific inputs.
- **Persistence:** All dynamic field values are saved directly into `products.attributes` JSON object upon saving.

---

## 3. Product Add Workflow (`InventoryAddNewUpload.jsx` / `InventoryController::store`)

The product creation process follows this verified execution chain:

```text
User Input: InventoryAddNewUpload.jsx
  │
  ├─► Step 1: Category & Subcategory Selection (Loads form_schema & attributes)
  ├─► Step 2: Basic Identity (Product Name, SKU / Product Code, Design No)
  ├─► Step 3: Metal & Purity Details (Purity, Gold Type, Stamp, Touch %)
  ├─► Step 4: Weight & Stock Metrics (Gross Wt, Net Gold Wt, Fine Wt, Initial Stock Qty)
  ├─► Step 5: Multi-Component Definition (Main Body, Screws, Stones, Diamonds)
  ├─► Step 6: Pricing & Commercials (Making Charge, Wastage %, Sale Rate)
  └─► Step 7: Image Uploads (Primary Thumbnail, Child Angles, Component Reference Files)
  │
  ▼
API Request: POST /api/inventory (or POST /api/products)
  │
  ▼
Controller: InventoryController::store(Request $request) [Line 769]
  │
  ├─► 1. DB::beginTransaction()
  ├─► 2. Resolve Category ID & Subcategory ID (with graceful fallback)
  ├─► 3. Validate / Generate Unique Product Code: RJ-[RAND]-[NUM]
  ├─► 4. File Processing: Save Base64 images to storage disks (prevents DB bloating)
  ├─► 5. Compile Attributes JSON (metal, weights, stamps, stones, components)
  ├─► 6. Product::create([...]) writes Master Product record
  ├─► 7. DB::commit()
  │
  ▼
Response: 201 Created with Product object
```

### Complete Field Inventory for Product Creation Form

| Field Label | Input Type | Required? | Default Value | Data Source | Stored Column | Notes / Next-Stage Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Category** | Dropdown | Yes | First active category | `categories` table | `products.category_id` | Governs available subcategories & form schema. |
| **Subcategory** | Dropdown | Yes | First subcategory | `subcategories` table | `products.subcategory_id` | Determines specific dynamic attributes. |
| **Product Name** | Text | Yes | `Product YYYYMMDD-HHMMSS` | User entered | `products.name` | Displayed across work orders, bills, and tags. |
| **Product Code / SKU**| Text | Yes (Auto) | `RJ-[3CHAR]-[4DIGIT]` | Auto-generated | `products.product_code` | Unique barcode lookup key for finished goods. |
| **Design Number** | Text | No | `DES-[RAND]` | User entered / Auto | `products.design_no` | Critical bridge between CAD, Job Orders & Tags. |
| **Gross Weight** | Decimal (3) | Yes | `0.000` | User entered (grams) | `products.opening_stock_weight` & `attributes->gross_wt` | Total physical item weight. |
| **Net Gold Weight** | Decimal (3) | Yes | `0.000` | User entered (grams) | `products.opening_fine_weight` & `attributes->net_wt` | Metal weight excluding stones. |
| **Purity / Karat** | Dropdown | Yes | `22K` / `91.6%` | `karats` / `gold_types` | `attributes->purity` & `attributes->gold_type` | Purity rating stamped on tag. |
| **Touch (%)** | Decimal (2) | Yes | `91.60` | Derived from Karat | `products.opening_touch` | Used to compute pure 24K gold equivalent. |
| **Stamp** | Dropdown | No | `+0` / `916 BIS` | `stamps` table | `attributes->stamp` | Dynamic stamp printed on thermal tags. |
| **Initial Stock Qty** | Number | Yes | `1` | User entered | `products.opening_stock_qty` & `current_stock_qty` | Initial available count in inventory catalog. |
| **Diamond Weight (Ct)**| Decimal (2) | No | `0.00` | User entered | `attributes->dia_wt_ct` | Total diamond carats. Converted via `× 0.2g`. |
| **Diamond Count** | Number | No | `0` | User entered | `attributes->diamond_count` | Number of diamonds in the piece. |
| **Colour Stone Wt** | Decimal (2) | No | `0.00` | User entered | `attributes->stone_wt` | Weight of rubies, emeralds, pearls. |
| **Wastage (%)** | Decimal (2) | No | `3.50` | User entered / default | `attributes->wastage_percent` | Benchmark wastage allowed for Karigar. |
| **Making Charge** | Decimal (2) | No | `650.00` | User entered | `attributes->making_charge` | Default artisan labor rate per gram. |
| **Making Charge Type**| Dropdown | No | `per_gram` | `per_gram`, `fixed`, `percentage` | `attributes->making_charge_type` | Calculation basis for labor. |
| **Open / Close Type** | Dropdown | No | `Close` | `Open`, `Close`, `Screw`, `Clip` | `attributes->open_close_type` | Physical jewelry construction type. |
| **Vendor / Supplier** | Dropdown | No | `None` | `suppliers` table | `attributes->vendor_name` | Original procurement source. |
| **Primary Image** | File / Camera | No | Placeholder SVG | Base64 / File upload | `products.image` & `attributes->thumb_image` | Displayed in catalog & work order attachments. |
| **Child Images** | Multi-file | No | `[]` | Multi-image selector | `attributes->child_images` | Alternative angles of the jewelry piece. |

---

## 4. Multi-Component & Stone Definitions (`components` Array)

When a design comprises multiple pieces (e.g. a necklace with a detachable pendant, or a bracelet with a screw clasp and diamond clusters), the software uses an embedded JSON `components` array inside `products.attributes`:

```json
{
  "components": [
    {
      "component_category": "Main Pendant",
      "material_type": "Gold",
      "purity": "22K",
      "gross_wt": 14.500,
      "net_wt": 13.200,
      "stamp": "916 BIS",
      "no_of_pieces": 1
    },
    {
      "component_category": "Diamond Cluster",
      "material_type": "Diamond",
      "dia_wt_ct": 1.25,
      "diamond_count": 18,
      "diamond_color": "G-H",
      "diamond_clarity": "VVS",
      "setting_style": "Prong",
      "stamp": "+7",
      "no_of_pieces": 18
    }
  ]
}
```

### Architectural Distinctions:
1. **Design Specification vs. Physical Stock:** Component definitions stored in `products.attributes` represent the **technical bill of materials (BOM) / blueprint** of the design. They do NOT decrement individual component stock upon saving a product.
2. **Dynamic Stamp Resolution:** When generating tags or issuing work orders, the system scans `components` to extract specific diamond stamps (`diaComp.stamp`) and diamond counts (`diaComp.no_of_pieces`) if not specified at the parent product header.

---

## 5. Stock Creation Behaviour

When a product is added via Master Inventory:
1. **Product Master Created:** A row is inserted in `products`.
2. **Stock Initialized:**
   - `opening_stock_qty` is set to the entered quantity (default `1`).
   - `current_stock_qty` is initialized to the same value (`1`).
   - `opening_stock_weight` is set to `gross_wt`.
   - `opening_fine_weight` is set to `net_wt`.
3. **Movement Ledger Entry:** If added through `InventoryController::store`, it is created as available inventory stock immediately. If added through the CAD Catalog (`ProductDesignController`), it creates a design record with zero physical stock until synced or produced.
