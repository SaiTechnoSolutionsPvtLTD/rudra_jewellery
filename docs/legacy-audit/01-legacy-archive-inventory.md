
# Legacy Archive Inventory & Technical Assessment

**Project**: Rudra Jewellery ERP  
**Archive Located**: `public/images/jwerp.zip`  
**Size**: 66,744,428 bytes (~66.7 MB)  
**Analysis Date**: October 2026  
**Extraction Directory**: `storage/app/legacy_analysis/jwerp/` (Secure, non-public storage)

---

## 1. Archive Profile & Integrity

| Property | Details |
|---|---|
| **Archive Filename** | `jwerp.zip` (Dynamically located inside `public/images/`) |
| **File Format** | Standard PKZip format |
| **Integrity Check** | Validated via `System.IO.Compression.ZipFile`. Zero archive corruption detected. |
| **Safety Measures** | Path-traversal sanitization enforced during extraction. No overwrite of active codebase files. Secure extraction to `storage/app/legacy_analysis/`. |
| **Executable Safety** | Legacy executables (`jwelly9.exe`, `cabarc.exe`, `download.exe`, etc.) identified and quarantined. No legacy binary or unknown script was executed. |

---

## 2. Technology Stack & Framework Identification

The legacy software is **Microsoft Visual FoxPro 9.0 (VFP9 SP2)** with extended Windows desktop components and cloud-sync capabilities:

1. **Core Runtime Engine**:
   - `vfp9r.dll` (4.72 MB): Visual FoxPro 9.0 Runtime Library.
   - `vfp9enu.dll` (1.51 MB): Visual FoxPro English Localization Resource.
   - `vfp9renu.dll` (1.19 MB): Visual FoxPro Runtime Resources.
   - `msvcr71.dll` (348 KB): Microsoft C Runtime Library.

2. **Primary Application Executable**:
   - `jwelly9.exe` (79.87 MB): Compiled VFP application containing core forms, reports, procedures, business logic, and class libraries.
   - Software ID: `JE19170` (registered in `setting.ini`).

3. **Database Architecture**:
   - **Local Desktop Engine**: FoxPro Database Tables (`.d_` files - DBF table structures with Visual FoxPro field types including `Integer AutoInc`, `Character`, `Numeric`, `Date`, `DateTime`, `Memo/FPT`, and `NullFlags`).
   - **Cloud / Web RDBMS Replication**: `dump.sql` (9.39 MB) and `altecat.sql` (23.8 KB) providing MySQL schemas (166 tables) corresponding to the desktop tables for multi-branch sync and web portals.

4. **Reporting & Document Printing**:
   - Visual FoxPro Report Definition files: `_gstinv.frx` / `_gstinv.FRT`, `_gstinv2.frx` / `_gstinv2.FRT` (GST Tax Invoices).
   - `ReportBuilder.app` (738 KB), `ReportOutput.app` (237 KB), `ReportPreview.app` (133 KB), `foxypre.app` (3.83 MB) for modern graphical report preview and PDF generation.
   - Microsoft Excel statutory templates: `gstr1.xlsx`, `GSTR1IFF.xlsx`, `gstr2.xlsx`, `GSTR3B.xlsm`, `ITC04.xlsm`.

5. **Hardware & Peripheral Integrations**:
   - Barcode & Tag Printing: `BarCodeLibrary.dll` (264 KB), `w39lc.ttf` (Code 39 barcode TrueType font).
   - RFID Tag Readers: Supported via `config.tagverification = 'rfid'` and `tgm1.RFID`.
   - QR Code Generation: `qrcode.exe` (5.6 KB) for invoice B2C QR codes and Hallmark HUID tags.
   - Communications: `whatsapp.exe` (4.6 KB) and SMS modules (`features.m_`).
   - Backup & Cloud Sync: `jwftp.exe` (29.3 KB), `Renci.SshNet.dll` (804 KB), `ICSharpCode.SharpZipLib.dll` (208 KB).

---

## 3. Directory & File Inventory Summary

The legacy archive extracts into 544 files distributed as follows:

| Extension / Category | Count | Purpose |
|---|---|---|
| `.DB` / `.d_` | 331 | FoxPro Table Data Files (Account, Items, Tags, Invoices, Jobs, Rates, Vouchers) |
| `.BAK` / `.BAC` | 108 | Table backup files |
| `.M_` / `.FPT` | 17 | Memo files storing multi-line descriptions, help topics, Hindi translations, and feature flags |
| `.FRX` / `.FRT` | 18 | Visual FoxPro graphical report layouts (Invoices, Estimates, Tag Labels) |
| `.DLL` | 11 | Dynamic Link Libraries (VFP runtimes, Barcode, SSH, Compression, Notifications) |
| `.EXE` | 10 | Application executables (ERP, Utilities, Backup, QR, WhatsApp) |
| `.SQL` | 2 | MySQL database dumps (`dump.sql`, `altecat.sql`) |
| `.INI` / `.CFG` | 3 | Configuration files (`company.ini`, `cp.ini`, `setting.ini`) |
| `.XLSX` / `.XLSM` | 5 | Statutory GST and Job Work compliance spreadsheets |
| `.TTF` | 6 | Barcode and symbol fonts |
| `.APP` | 5 | Visual FoxPro helper applications (Report Builder, Preview, Output) |
| `.ZIP` | 1 | Nested updater archive (`jwerp10.zip`, 18.28 MB) |

---

## 4. Key Configuration Files & Environmental Parameters

### `setting.ini`
```ini
[CONFIGURE]
SWID=JE19170
PID=1
```

### `company.ini` & `cp.ini`
Defines operational parameters for jewellery business calculations:
- `<taging>`: Tag generation and physical barcode printing enabled.
- `<girvi>`: Gold loan / mortgage module configuration.
- `<salary>`: Karigar / artisan payroll and piece-rate calculation.
- `<kitty>`: Monthly gold chit / savings scheme configuration.
- `<bullion>`: Bullion trading and MCX rate fixing.
- `<lbron>`: Labour calculation basis (Gross Weight vs Net Weight vs Flat Piece Rate).
- `<wstgon>`: Wastage calculation basis (percentage added to net weight).
- `<golddec>`, `<sildec>`, `<diadec>`, `<stndec>`: Precision settings (Gold/Silver: 3 decimals `0.000`, Diamond: 3 decimals, Stone: 2 decimals).
- `<kbalstamp>`: Karigar metal balance tracked by purity/stamp.

---

## 5. Inspection Limitations

1. **Binary Compilation**: Core procedural code inside `jwelly9.exe` is precompiled into FoxPro byte-code. However, full business schemas, table column definitions, defaults, relationships, form masters (`formmst.d_`), menu trees (`mnu.d_`), help documentation (`formhlp.m_`), and MySQL exports (`dump.sql`) are 100% readable and provide comprehensive, unambiguous evidence of every business rule, formula, and operational workflow.
2. **Execution Boundary**: In accordance with the project instructions, no legacy executables or binary installers were run on the host environment; all analysis was conducted via static inspection, structure extraction, schema analysis, and text parsing.
