# MASTER → ITEM MASTER — DETAILED PRODUCTION ITEM STRUCTURE

## Objective

Redesign the existing **Item Master** based on the provided reference image.

The Item Master must maintain the same business concept and detailed production configuration shown in the reference application.

The new implementation must be a modern ERP interface while preserving the existing business logic and data relationships.

IMPORTANT:

- Do not convert Item Master into a simple item-name list.
- Do not remove production-related fields.
- Do not remove Weft Detail, Warp Detail, Setup Configuration or Status Configuration.
- Do not remove Beam/Product configuration.
- Do not remove Pick, Card, Denier, Rate, Per Pcs Yarn, Cost or BOM-related information.
- Preserve the existing database structure wherever possible.
- Do not break existing backup/restore compatibility.
- Do not change unrelated Masters or modules.

---

# 1. ITEM MASTER PURPOSE

Item Master is the central master for defining a textile production item/product and its manufacturing configuration.

The Item Master must maintain the information required for:

- Production
- Design
- Costing
- Yarn requirement
- Beam configuration
- Pick/Card calculation
- Rate calculation
- BOM
- Material consumption
- Production planning

The logical structure is:

```text
Item / Product
    ↓
Basic Configuration
    ↓
Weft Detail
    ↓
Warp Detail
    ↓
Setup Configuration
    ↓
Status Configuration
    ↓
Beam / Yarn / Material Configuration
    ↓
BOM / Cost Information
```

---

# 2. ITEM MASTER LIST PAGE

Create:

```text
Masters
└── Item
```

Page title:

```text
Item Master
```

Breadcrumb:

```text
Home > Masters > Item
```

Add:

```text
+ New Item
```

---

# 3. ITEM MASTER LIST

The main Item Master list should contain:

| Code | Item Name | Product Type | UOM | Status | Remark | Actions |
|------|-----------|--------------|-----|--------|--------|---------|
| I-01 | Kashmiri Pashmina | Fabric | MTR | Active | Premium quality | Edit/Delete |
| I-02 | Plain Fabric | Fabric | MTR | Active | Standard | Edit/Delete |

The list must support:

- Search
- Filtering
- Column sorting
- Edit
- Delete
- Activate/Deactivate
- View details

---

# 4. ITEM CODE

Item Code must be automatically generated.

Recommended format:

```text
I-01
I-02
I-03
I-04
...
```

Rules:

- Automatically generated.
- Unique.
- Read-only.
- User cannot manually change the code.
- Editing the Item must never change its code.
- Deleted codes must not be reused.
- Existing item IDs/codes must be preserved during migration.

If the existing application already has a different Item Code numbering system, preserve the existing numbering instead of changing existing records.

---

# 5. BASIC CONFIGURATION

The first tab should be:

```text
BASIC CONFIGURATION
```

Modernize the layout of the reference screen but maintain the business fields.

Recommended fields:

```text
Item Code
Item Name
Product Type
Item Category
UOM
Description
Remark
Status
```

Additional production fields from the existing Item Master must also remain available.

---

# 6. PRODUCT TYPE

Product Type must be maintained as a controlled selection.

Examples:

```text
Fabric
Yarn
Grey Fabric
Finished Fabric
Beam
Chemical
Packing Material
Accessory
Other
```

Do not create duplicate Product Type master logic if it already exists elsewhere.

---

# 7. WEFT DETAIL TAB

Maintain a dedicated:

```text
WEFT DETAIL
```

tab.

The reference application contains Weft-specific production information.

The new screen should preserve this concept.

Suggested structure:

```text
WEFT DETAIL

Ground Pick        [          ]
Cut                [          ]
Width / Reed       [          ]
Reed Space         [          ]
Copy Recipe        [          ]

Sale Rate          [          ]
Other Cost         [          ]

Beam Product       [          ]
No. of Ends        [          ]
Meter              [          ]

Denier             [          ]
Weight Per Pcs     [          ]
Rate               [          ]
Cost               [          ]
```

Do not remove existing fields simply because they are not required in the initial list view.

---

# 8. WARP DETAIL TAB

Maintain a dedicated:

```text
WARP DETAIL
```

tab.

The exact existing Warp fields should be preserved if already present in the current database/application.

The tab must support the Warp-side production configuration.

Do not invent additional production calculations unless required.

---

# 9. SETUP CONFIGURATION TAB

Maintain:

```text
SETUP CONFIGURATION
```

This tab should contain the Item's machine/setup-related configuration.

Any existing setup fields and relationships must remain intact.

Use structured fields rather than one large text field wherever the existing data requires calculations.

---

# 10. STATUS CONFIGURATION TAB

Maintain:

```text
STATUS CONFIGURATION
```

This section should control the Item's operational status.

At minimum:

```text
Active
Deactive
```

Default:

```text
Active
```

Rules:

### Active

Item can be selected in new transactions.

### Deactive

Item:

- Cannot be selected in new transactions.
- Remains available in historical transactions.
- Remains visible in reports.
- Can be reactivated by an authorized user.

Never delete historical Item references.

---

# 11. BEAM / MATERIAL CONFIGURATION

The reference screen contains a Beam section with a grid.

Maintain this concept.

Create a modern dynamic table:

```text
BEAM / MATERIAL CONFIGURATION
```

Example:

| No. | Product / Yarn Name | Pick | Card | Denier | Per Pcs Yarn | Rate | Per Pcs Rate |
|-----|----------------------|------|------|--------|--------------|------|--------------|
| 1 | 140 Nylon | 120 | 64 | 145 | 0.250 | ₹210 | ₹52.50 |
| 2 | Jari 250D | 120 | 64 | 250 | 0.150 | ₹280 | ₹42.00 |

---

# 12. ADD MATERIAL / BEAM ROW

Provide:

```text
+ Add Row
```

button.

When clicked:

```text
No. = automatically generated
Product / Yarn = blank
Pick = blank
Card = blank
Denier = blank
Per Pcs Yarn = calculated/input
Rate = fetched/input
Per Pcs Rate = calculated
```

The user must be able to add multiple material/yarn rows.

---

# 13. PRODUCT / YARN SELECTION

Product / Yarn Name should preferably come from the existing:

```text
Yarn Master
```

or appropriate Item Master reference.

Do not allow uncontrolled duplicate text entries if the material already exists in a master.

Provide search/select:

```text
[ Search Yarn / Material... ]
```

After selecting the material, populate applicable information such as:

```text
Denier
Rate
UOM
```

according to the existing business rules.

---

# 14. PICK

Pick must be available in the Beam/Material configuration where applicable.

Example:

```text
Pick
[ 120 ]
```

Pick should be numeric and validated.

Do not allow negative values.

---

# 15. CARD

Card must be available in the Beam/Material configuration.

Example:

```text
Card
[ 64 ]
```

Card should be numeric and validated.

Do not allow negative values.

---

# 16. DENIER

Maintain:

```text
Denier
```

as a production/material property.

Example:

```text
145
250
70
```

Where Denier is available from Yarn Master, allow it to be automatically populated.

---

# 17. PER PCS YARN

Maintain:

```text
Per Pcs Yarn
```

This field represents yarn consumption per piece according to the existing Item Master calculation.

It may be calculated from the production configuration where the existing system already provides such a calculation.

Do not replace an existing business calculation with a guessed formula.

---

# 18. RATE

Maintain:

```text
Rate
```

Rate should represent the applicable yarn/material rate.

Where the rate comes from Yarn/Material Master, allow it to be populated from the master.

If the Item requires a specific overridden rate, allow authorized users to maintain the applicable value according to the existing business rule.

---

# 19. PER PCS RATE

Maintain:

```text
Per Pcs Rate
```

This should be calculated according to the existing costing logic.

Do not hard-code a new formula unless the existing application already defines the calculation.

If the current system calculates Per Pcs Rate automatically, preserve that calculation.

---

# 20. BEAM ROW ACTIONS

Every Beam/Material row should support:

```text
Edit
Delete
```

or inline editing.

Example:

```text
No. | Product | Pick | Card | Denier | Rate | Actions
1   | Nylon   | 120  | 64   | 145    | 210  | Edit Delete
```

Deleting a row must require confirmation.

---

# 21. COPY RECIPE

The reference application contains:

```text
Copy Recipe
```

Maintain this functionality.

Purpose:

> Copy an existing Item's production/material recipe into the current Item.

Workflow:

```text
Copy Recipe
     ↓
Select Existing Item
     ↓
Preview Recipe
     ↓
Confirm Copy
     ↓
Copy Beam/Material Configuration
```

IMPORTANT:

Copying a recipe must NOT modify the original Item.

It creates/copies configuration into the current Item.

---

# 22. COPY COLUMN

The reference application contains:

```text
Copy Column
```

Maintain this concept if it is part of the existing business workflow.

The user should be able to copy a selected configuration column/values to another applicable column where supported.

Do not remove this functionality without confirming that it is unused.

---

# 23. BOM DESCRIPTION

Maintain:

```text
BOM Description
```

as a separate field.

Example:

```text
BOM Description
[ Premium Kashmiri Pashmina production recipe... ]
```

This should support multiple lines.

---

# 24. TOTAL CALCULATIONS

The reference screen contains:

```text
Total Pick
Total Card
Total Per Pcs Yarn
Pick Rate
Per Pcs Yarn
Job Rate
Net Cost
```

Maintain these summary calculations.

Recommended layout:

```text
TOTALS / COST SUMMARY

Total Pick          [ calculated ]
Total Card          [ calculated ]
Total Per Pcs Yarn  [ calculated ]

Pick Rate           [ calculated ]
Per Pcs Yarn        [ calculated ]
Job Rate            [ calculated ]

Net Cost            [ calculated ]
```

Do not allow users to directly overwrite calculated fields unless the existing business rule explicitly permits manual override.

---

# 25. IMAGE

The reference Item Master contains an Image option.

Maintain:

```text
Item Image
```

Allow:

- JPG
- PNG
- WEBP

Use the existing application's upload/storage rules.

Show a preview.

---

# 26. REMARK

Every Item Master entry MUST have:

```text
Remark
```

Example:

```text
Remark
[ Premium fabric. Use approved yarn only. ]
```

Remark must:

- Be editable.
- Be preserved when editing.
- Support multiple lines.
- Be available in View Details.
- Be included in audit history when changed.
- Be searchable where practical.

---

# 27. ACTIONS

Every Item Master record MUST have:

```text
Edit
Delete
```

Actions menu:

```text
View
Edit
Delete
Deactivate
```

For a Deactive record:

```text
View
Edit
Activate
Delete
```

---

# 28. DELETE RULE

Before deleting:

```text
Delete Item I-01?

This action cannot be undone.
```

Check whether the Item is referenced by:

- Purchase
- Sales
- Production
- Design
- Inventory
- BOM
- Stock
- Costing
- Any historical transaction

### If unused:

Allow deletion after confirmation.

### If referenced:

Do NOT hard-delete.

Show:

```text
This Item is already used in the system and cannot be deleted.

Please deactivate the Item instead.
```

Historical records must remain intact.

---

# 29. EDIT RULE

Edit must open the complete Item Master form.

The user must be able to edit:

```text
Basic Configuration
Weft Detail
Warp Detail
Setup Configuration
Status Configuration
Beam / Material Configuration
BOM Description
Remark
Image
```

System-generated:

```text
Item Code
Item ID
```

must remain read-only.

Editing must update the existing record and must not create a duplicate Item.

---

# 30. ITEM MASTER FORM LAYOUT

Use a modern ERP layout based on the reference structure.

Recommended:

```text
┌──────────────────────────────────────────────────────────────┐
│ ITEM MASTER                                      [X]         │
├──────────────────────────────────────────────────────────────┤
│ Item Code     Item Name              Product Type            │
│ [I-01]        [................]      [Fabric ▼]             │
├──────────────────────────────────────────────────────────────┤
│ Basic Configuration | Weft Detail | Warp Detail | Setup |    │
│ Status Configuration                                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                 ACTIVE TAB CONTENT                           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ BEAM / MATERIAL CONFIGURATION                                │
│                                                              │
│ [+ Add Row]  [Copy Recipe]                                   │
│                                                              │
│ No | Product | Pick | Card | Denier | Yarn | Rate | Cost     │
│ 1  | ...     | ...  | ...  | ...    | ...  | ...  | ...      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ BOM Description                                               │
│ [..........................................................] │
├──────────────────────────────────────────────────────────────┤
│ COST SUMMARY                                                  │
│ Total Pick | Total Card | Yarn | Pick Rate | Job Rate | Cost │
├──────────────────────────────────────────────────────────────┤
│ Remark                                                        │
│ [..........................................................] │
├──────────────────────────────────────────────────────────────┤
│ [Cancel] [Save] [Save & Close]                               │
└──────────────────────────────────────────────────────────────┘
```

---

# 31. MODERNIZE — DO NOT COPY THE OLD VISUAL STYLE

The reference image is a legacy desktop ERP interface.

Do NOT copy:

- Old Windows-style buttons
- Old grey/blue desktop UI
- Small cramped controls
- Legacy tab styling
- Fixed-resolution layout

Instead:

Maintain the **same business structure and fields**, but implement it using the existing modern ERP design system.

Use:

- Existing sidebar
- Existing page header
- Existing cards
- Existing input components
- Existing table components
- Existing buttons
- Existing modal/drawer style
- Existing typography
- Existing responsive layout

---

# 32. ITEM MASTER DATA RELATIONSHIPS

The logical relationship should be:

```text
Item Master
    │
    ├── Basic Information
    ├── Weft Detail
    ├── Warp Detail
    ├── Setup Configuration
    ├── Status Configuration
    ├── Beam / Yarn Configuration
    ├── BOM Description
    ├── Cost Summary
    └── Remark
```

Do not store all configuration as one large JSON/text field if the existing database already has structured relationships.

Preserve structured data wherever possible.

---

# 33. DATABASE SAFETY

IMPORTANT:

Do not create a completely new Item database if an Item Master already exists.

First inspect:

- Existing Item table
- Existing Item fields
- Existing Item relationships
- Existing production references
- Existing costing references
- Existing inventory references
- Existing backup/restore mechanism

Then extend the existing structure.

Do not:

- Delete existing Item data
- Rename existing IDs unnecessarily
- Break foreign keys
- Change existing backup format unnecessarily
- Duplicate Yarn/Material master records
- Duplicate production configuration tables

---

# 34. AUDIT

Track:

```text
Created By
Created Date
Modified By
Modified Date
```

Audit actions:

```text
CREATE
EDIT
DELETE
ACTIVATE
DEACTIVATE
COPY RECIPE
```

If the ERP already has centralized Audit History, use it.

---

# 35. SEARCH AND SORT

Item Master list must support:

### Search

```text
Search Item by code, name, product type, category...
```

### Filters

```text
All
Active
Deactive
Product Type
Category
```

### Sorting

Sortable columns:

```text
Code
Item Name
Product Type
UOM
Status
```

Use the existing ERP table sorting behavior.

---

# 36. VALIDATION

Required:

```text
Item Code — system generated
Item Name — required
Product Type — required
Status — required
```

Production fields should have appropriate numeric validation:

```text
Pick
Card
Denier
Rate
Cost
Per Pcs Yarn
```

Do not allow invalid negative values where the business meaning does not permit them.

---

# 37. ACCEPTANCE CRITERIA

Item Master is complete only when:

- [ ] Item Master list exists
- [ ] New Item works
- [ ] Item Code auto-generates
- [ ] Item Code is read-only
- [ ] Basic Configuration exists
- [ ] Weft Detail exists
- [ ] Warp Detail exists
- [ ] Setup Configuration exists
- [ ] Status Configuration exists
- [ ] Beam/Material grid exists
- [ ] Product/Yarn selection works
- [ ] Pick exists
- [ ] Card exists
- [ ] Denier exists
- [ ] Per Pcs Yarn exists
- [ ] Rate exists
- [ ] Per Pcs Rate exists
- [ ] Add Beam/Material row works
- [ ] Beam/Material row Edit works
- [ ] Beam/Material row Delete works
- [ ] Copy Recipe works
- [ ] Copy Column is maintained if currently used
- [ ] BOM Description exists
- [ ] Total Pick exists
- [ ] Total Card exists
- [ ] Total Per Pcs Yarn exists
- [ ] Pick Rate exists
- [ ] Job Rate exists
- [ ] Net Cost exists
- [ ] Item Image works
- [ ] Remark exists
- [ ] Edit Item works
- [ ] Delete Item works
- [ ] Activate/Deactivate works
- [ ] Referential integrity is checked before deletion
- [ ] Historical references remain intact
- [ ] Search works
- [ ] Filters work
- [ ] Column sorting works
- [ ] Audit works
- [ ] Existing Item data is preserved
- [ ] Existing database relationships are preserved
- [ ] Existing backup/restore remains compatible

---

# FINAL REQUIREMENT

**Maintain the business structure of the reference Item Master.**

The Item Master must NOT be reduced to:

```text
Item Code
Item Name
UOM
Rate
```

It must remain a **production-oriented Item Master** containing:

```text
Basic Configuration
+
Weft Detail
+
Warp Detail
+
Setup Configuration
+
Status Configuration
+
Beam / Yarn Configuration
+
Pick
+
Card
+
Denier
+
Per Pcs Yarn
+
Rate
+
Cost
+
BOM Description
+
Cost Summary
+
Image
+
Remark
```

Modernize the UI, but preserve the functionality and production data model represented by the reference Item Master.
