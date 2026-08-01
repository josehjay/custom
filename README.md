# custom

Custom ERPNext app that provides:

- POS item selector UI enhancements.
- Price automation from buying prices to selling price lists.
- Default selling price list fallback when customer price list has no item rate.
- Item standard selling rate synchronization from Item Price.

## App metadata

- App name: `custom`
- Required app: `erpnext`
- Python: `>=3.11`

## Functionalities in this module

### 1) POS Item Selector: list view with images and pagination

This app patches ERPNext POS `ItemSelector` on the POS page and adds:

- Grid/List view switcher near the item-group filter.
- List view with columns: Image, Name, Price, UOM, Quantity Available.
- Sticky header and sticky pager in list mode.
- Quantity color indicators:
  - Green: qty > 10
  - Orange: qty between 1 and 10
  - Red: qty <= 0
- Item image thumbnail (or initials fallback if no image).
- Client-side pagination (default page size: 24).
- Compatible with `point_of_sale` and `point-of-sale` routes.

Enable/disable is controlled by a POS Profile checkbox:

- Field: `use_custom_list_view_with_images`
- Label: `Use Custom List View with Images`

If disabled, ERPNext default item selector rendering is used.

### 2) Default price list as source of truth for Item standard selling rate

`Item.standard_rate` is always derived from `Item Price` in the default selling price list:

- On every `Item` validate, `standard_rate` is recomputed from default selling list.
- On `Item Price` insert/update/delete, linked Item `standard_rate` is re-synced.

Default selling price list resolution:

1. `Selling Settings.selling_price_list`
2. Fallback: latest enabled selling `Price List` (prefers `is_default`).

Rate resolution rules:

- Uses currently valid `Item Price` by date (`valid_from` / `valid_upto`).
- Chooses most recent valid record.
- If no valid price exists, rate resolves to `0`.

### 3) Auto-generate selling prices from buying price + margin

For selected selling price lists, the app can auto-calculate item selling prices:

- Formula: `selling_price = latest_buying_price * (1 + margin_percent / 100)`
- Triggered when buying `Item Price` is inserted/updated/deleted.
- Uses per-price-list margin configuration.
- Can optionally use Item Group margin overrides.
- Creates or updates selling `Item Price` rows for stock UOM and all item-defined UOMs.
- Buying price source is the latest submitted purchase transaction price (not average).

Default buying price list resolution:

1. `Buying Settings.buying_price_list`
2. Fallback: latest enabled buying `Price List` (prefers `is_default`).

Per selling price list configuration fields (on `Price List`):

- `custom_auto_price_from_buying` (Check)
- `custom_buying_margin_percent` (Percent)
- `custom_buying_source_price_list` (Link to `Price List`, optional)
- `custom_use_item_group_margins` (Check)
- `custom_item_group_margins` (Table: `Price List Item Group Margin`)

If `custom_buying_source_price_list` is empty, default buying price list is used.
Buying price list is used as a fallback only when no purchase history exists.

If `custom_use_item_group_margins` is enabled, margin resolution priority is:

1. Matching row in price list table `custom_item_group_margins` (per price list, per item group).
2. `Price List.custom_buying_margin_percent` (default for that price list).

### 4) Manual override support for item selling prices

Users can manually adjust an item price in a margin-managed selling price list, and the app will preserve that override:

- Auto-generated rows are marked as auto-managed.
- If user edits price on auto-managed row, row is marked as manual override.
- Future auto-margin recalculations skip manual-override rows.

`Item Price` fields added by this app:

- `custom_manual_price_override` (Check, visible)
- `custom_auto_margin_managed` (Check, hidden/internal)

### 5) Price lookup fallback for customer-assigned price lists

When ERPNext fetches item details and selected selling price list has no rate for that item:

- App falls back to rate from default selling price list.
- Returned `price_list_rate` (and `rate` if empty) uses default price list value.

This is implemented by overriding:

- `erpnext.stock.get_item_details.get_item_details`

with:

- `custom.custom_extensions.item_standard_rate_sync.get_item_details_with_default_pricelist_fallback`

## Patches and schema changes

This app applies patches in `custom/patches.txt`:

1. `v0_0_1.add_custom_pos_section_to_pos_profile`
   - Adds initial POS custom fields.
2. `v0_0_2.remove_custom_pos_section_and_move_toggle`
   - Keeps POS toggle in core configuration area and removes legacy section field.
3. `v0_0_3.add_price_list_margin_fields`
   - Adds margin automation fields on `Price List`.
4. `v0_0_4.add_item_price_manual_override_fields`
   - Adds manual override and auto-managed flags on `Item Price`.
5. `v0_0_5.add_item_group_margin_fields`
   - Adds initial item-group margin support fields.
6. `v0_0_6.add_pricelist_item_group_margin_table`
   - Adds price-list child table for per-item-group margin overrides.
7. `v0_0_7.remove_item_group_pricing_automation_fields`
   - Removes Item Group-level pricing automation fields; pricing is now controlled in Price List only.

## Hooks used

Defined in `custom/hooks.py`:

- `page_js` for POS route injection.
- `app_include_js` fallback bundle include.
- `doc_events`:
  - `Item.validate`
  - `Item Price.after_insert`
  - `Item Price.on_update`
  - `Item Price.on_trash`
- `override_whitelisted_methods`:
  - `erpnext.stock.get_item_details.get_item_details`

## Installation / update

From bench:

```bash
bench --site <your-site> install-app custom
bench --site <your-site> migrate
bench build --app custom
bench --site <your-site> clear-cache
bench restart
```

If app is already installed and you only changed code/patches:

```bash
bench --site <your-site> migrate
bench build --app custom
bench --site <your-site> clear-cache
bench restart
```

## Automatic versioning

Every `git push` / remote sync bumps the patch version (`custom/__init__.py` and `setup.py`) and commits `chore: bump version to X.Y.Z`.

After cloning, enable the git hook once:

```bash
python scripts/install_git_hooks.py
```

Skip a bump when needed: `SKIP_VERSION_BUMP=1 git push`.

## Recommended configuration checklist

1. In `POS Profile`, set `Use Custom List View with Images` as needed.
2. In `Selling Settings`, set `selling_price_list` (default selling list).
3. In `Buying Settings`, set `buying_price_list` (default buying list).
4. For each selling `Price List` that should auto-calculate:
   - enable `Auto Price From Buying`
   - set `Buying Margin %`
   - optionally set `Buying Source Price List`
   - enable `Use Item Group Margins` if you want per-group margins
   - in `Item Group Margins` table, add specific item groups and margins for that price list
5. For item-level exceptions, edit `Item Price` and keep `Manual Price Override` checked.
