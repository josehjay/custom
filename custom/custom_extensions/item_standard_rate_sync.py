import frappe
from frappe.utils import flt, nowdate


def get_default_selling_price_list() -> str | None:
    """Return the configured default selling price list name."""
    price_list = frappe.db.get_single_value("Selling Settings", "selling_price_list")
    if price_list:
        return price_list

    fallback = frappe.db.get_value(
        "Price List",
        {"selling": 1, "enabled": 1},
        "name",
        order_by="is_default desc, modified desc",
    )
    return fallback


def get_default_buying_price_list() -> str | None:
    """Return the configured default buying price list name."""
    price_list = frappe.db.get_single_value("Buying Settings", "buying_price_list")
    if price_list:
        return price_list

    fallback = frappe.db.get_value(
        "Price List",
        {"buying": 1, "enabled": 1},
        "name",
        order_by="is_default desc, modified desc",
    )
    return fallback


def get_default_price_list_rate(item_code: str, price_list: str) -> float:
    """Get the latest currently valid selling price for item in the given list."""
    today = nowdate()

    rate = frappe.db.sql(
        """
        select price_list_rate
        from `tabItem Price`
        where item_code = %(item_code)s
          and price_list = %(price_list)s
          and ifnull(selling, 0) = 1
          and (valid_from is null or valid_from <= %(today)s)
          and (valid_upto is null or valid_upto >= %(today)s)
        order by ifnull(valid_from, '1900-01-01') desc, modified desc
        limit 1
        """,
        {"item_code": item_code, "price_list": price_list, "today": today},
        as_list=True,
    )

    return flt(rate[0][0]) if rate else 0.0


def get_buying_price_list_rate(item_code: str, price_list: str) -> float:
    """Get latest currently valid buying Item Price (fallback source only)."""
    today = nowdate()

    rate = frappe.db.sql(
        """
        select price_list_rate
        from `tabItem Price`
        where item_code = %(item_code)s
          and price_list = %(price_list)s
          and ifnull(buying, 0) = 1
          and (valid_from is null or valid_from <= %(today)s)
          and (valid_upto is null or valid_upto >= %(today)s)
        order by ifnull(valid_from, '1900-01-01') desc, modified desc
        limit 1
        """,
        {"item_code": item_code, "price_list": price_list, "today": today},
        as_list=True,
    )

    return flt(rate[0][0]) if rate else 0.0


def get_latest_buying_rate_from_transactions(item_code: str) -> float:
    """
    Get latest buying price from submitted transactions normalized to stock UOM.

    Priority:
    1) Most recent submitted Purchase Invoice Item rate (non-return).
    2) Fallback to Item.last_purchase_rate.
    """
    if not item_code:
        return 0.0

    invoice_rate = frappe.db.sql(
        """
        select
            pii.rate,
            ifnull(pii.conversion_factor, 1) as conversion_factor
        from `tabPurchase Invoice Item` pii
        inner join `tabPurchase Invoice` pi on pi.name = pii.parent
        where pii.item_code = %(item_code)s
          and pi.docstatus = 1
          and ifnull(pi.is_return, 0) = 0
          and ifnull(pii.rate, 0) > 0
        order by pi.posting_date desc, pi.posting_time desc, pi.creation desc
        limit 1
        """,
        {"item_code": item_code},
        as_dict=True,
    )
    if invoice_rate:
        row = invoice_rate[0]
        rate = flt(row.get("rate") or 0)
        conversion_factor = flt(row.get("conversion_factor") or 1)
        if rate > 0 and conversion_factor > 0:
            return rate / conversion_factor

    return flt(frappe.db.get_value("Item", item_code, "last_purchase_rate") or 0.0)


def resolve_standard_rate(item_code: str) -> float:
    """Resolve the standard selling rate from default selling price list."""
    if not item_code:
        return 0.0

    default_price_list = get_default_selling_price_list()
    if not default_price_list:
        return 0.0

    return get_default_price_list_rate(item_code, default_price_list)


def sync_item_standard_rate(item_code: str) -> None:
    """Persist Item.standard_rate from Item Price (source of truth)."""
    if not item_code:
        return

    standard_rate = resolve_standard_rate(item_code)
    current_rate = flt(frappe.db.get_value("Item", item_code, "standard_rate") or 0.0)

    if current_rate == standard_rate:
        return

    frappe.db.set_value("Item", item_code, "standard_rate", standard_rate, update_modified=False)


def get_margin_enabled_selling_price_lists() -> list[dict]:
    """Return selling price lists configured for auto-margin pricing."""
    meta = frappe.get_meta("Price List")
    if not meta.get_field("custom_auto_price_from_buying"):
        return []

    margin_field = "custom_buying_margin_percent"
    buying_source_field = "custom_buying_source_price_list"
    use_item_group_margins_field = "custom_use_item_group_margins"

    result = frappe.get_all(
        "Price List",
        filters={"selling": 1, "enabled": 1, "custom_auto_price_from_buying": 1},
        fields=["name", "currency", margin_field, buying_source_field, use_item_group_margins_field],
    )
    return result


def is_margin_enabled_price_list(price_list: str) -> bool:
    """Check if a selling price list uses auto pricing from buying price."""
    if not price_list:
        return False

    return bool(
        frappe.db.get_value(
            "Price List",
            price_list,
            "custom_auto_price_from_buying",
        )
    )


def upsert_selling_item_price(item_code: str, price_list: str, uom: str, rate: float) -> None:
    """Create or update the selling Item Price row for a specific UOM."""
    if not item_code or not price_list or not uom:
        return

    currency = frappe.db.get_value("Price List", price_list, "currency")

    existing_name = frappe.db.get_value(
        "Item Price",
        {
            "item_code": item_code,
            "price_list": price_list,
            "selling": 1,
            "uom": uom,
        },
        "name",
        order_by="valid_from desc, modified desc",
    )

    if existing_name:
        existing = frappe.db.get_value(
            "Item Price",
            existing_name,
            ["custom_manual_price_override"],
            as_dict=True,
        )
        if flt((existing or {}).get("custom_manual_price_override")) == 1:
            return

        frappe.flags.custom_auto_margin_sync = True
        try:
            frappe.db.set_value(
                "Item Price",
                existing_name,
                {
                    "price_list_rate": flt(rate),
                    "custom_auto_margin_managed": 1,
                },
            )
        finally:
            frappe.flags.custom_auto_margin_sync = False
        return

    doc = frappe.get_doc(
        {
            "doctype": "Item Price",
            "item_code": item_code,
            "price_list": price_list,
            "price_list_rate": flt(rate),
            "currency": currency,
            "uom": uom,
            "selling": 1,
            "buying": 0,
            "custom_manual_price_override": 0,
            "custom_auto_margin_managed": 1,
        }
    )
    frappe.flags.custom_auto_margin_sync = True
    try:
        doc.insert(ignore_permissions=True)
    finally:
        frappe.flags.custom_auto_margin_sync = False


def get_item_group(item_code: str) -> str | None:
    return frappe.db.get_value("Item", item_code, "item_group")


def get_price_list_item_group_margin_map(price_list: str) -> dict[str, float]:
    """Return per-item-group margin overrides for a specific price list."""
    if not price_list:
        return {}

    if not frappe.db.exists("DocType", "Price List Item Group Margin"):
        return {}

    rows = frappe.get_all(
        "Price List Item Group Margin",
        filters={
            "parent": price_list,
            "parenttype": "Price List",
            "parentfield": "custom_item_group_margins",
        },
        fields=["item_group", "margin_percent"],
    )
    return {row.get("item_group"): flt(row.get("margin_percent") or 0) for row in rows if row.get("item_group")}


def get_item_uom_conversion_map(item_code: str) -> dict[str, float]:
    """Return UOM conversion factors against stock UOM."""
    item = frappe.get_doc("Item", item_code)
    conversion_map: dict[str, float] = {item.stock_uom: 1.0}

    for row in item.get("uoms") or []:
        uom = row.get("uom")
        factor = flt(row.get("conversion_factor") or 0)
        if not uom or factor <= 0:
            continue
        conversion_map[uom] = factor

    return conversion_map


def sync_margin_based_selling_prices(item_code: str) -> None:
    """Generate selling prices from buying price + per-list margin."""
    if not item_code:
        return

    selling_lists = get_margin_enabled_selling_price_lists()
    if not selling_lists:
        return

    latest_buying_rate_stock_uom = get_latest_buying_rate_from_transactions(item_code)
    default_buying_list = get_default_buying_price_list()
    item_uom_map = get_item_uom_conversion_map(item_code)
    item_group = get_item_group(item_code)

    for price_list in selling_lists:
        margin_pct = flt(price_list.get("custom_buying_margin_percent") or 0.0)
        if flt(price_list.get("custom_use_item_group_margins")) == 1:
            price_list_group_margins = get_price_list_item_group_margin_map(price_list.get("name"))
            if item_group and item_group in price_list_group_margins:
                margin_pct = flt(price_list_group_margins[item_group])

        buying_rate_stock_uom = latest_buying_rate_stock_uom
        if buying_rate_stock_uom <= 0 and default_buying_list:
            # Operational fallback only when there is no purchase history yet.
            source_buying_list = price_list.get("custom_buying_source_price_list") or default_buying_list
            buying_rate_stock_uom = get_buying_price_list_rate(item_code, source_buying_list)

        selling_rate_stock_uom = (
            buying_rate_stock_uom * (1 + (margin_pct / 100)) if buying_rate_stock_uom > 0 else 0.0
        )

        for uom, factor in item_uom_map.items():
            selling_rate_for_uom = selling_rate_stock_uom * flt(factor)
            upsert_selling_item_price(
                item_code=item_code,
                price_list=price_list.get("name"),
                uom=uom,
                rate=selling_rate_for_uom,
            )


def _extract_item_context(args, kwargs) -> frappe._dict:
    raw_args = kwargs.get("args")
    if raw_args is None and args:
        raw_args = args[0]

    return frappe._dict(frappe.parse_json(raw_args or {}) or {})


def get_item_details_with_default_pricelist_fallback(*args, **kwargs):
    """
    Wrap ERPNext item details so missing customer price falls back to default list.
    """
    from erpnext.stock.get_item_details import get_item_details as erpnext_get_item_details

    out = frappe._dict(erpnext_get_item_details(*args, **kwargs))
    ctx = _extract_item_context(args, kwargs)

    item_code = ctx.get("item_code")
    selected_price_list = ctx.get("selling_price_list") or ctx.get("price_list")
    if not item_code or not selected_price_list:
        return out

    if flt(out.get("price_list_rate")) > 0:
        return out

    default_price_list = get_default_selling_price_list()
    if not default_price_list or default_price_list == selected_price_list:
        return out

    fallback_rate = get_default_price_list_rate(item_code, default_price_list)
    if fallback_rate <= 0:
        return out

    out.price_list_rate = fallback_rate
    if flt(out.get("rate")) <= 0:
        out.rate = fallback_rate
    if not out.get("selling_price_list"):
        out.selling_price_list = selected_price_list

    return out


def enforce_item_standard_rate(doc, method=None):
    """Always derive Item.standard_rate from Item Price on save."""
    sync_margin_based_selling_prices(doc.name)
    doc.standard_rate = resolve_standard_rate(doc.name)


def on_item_price_change(doc, method=None):
    """Sync Item.standard_rate whenever Item Price changes."""
    if (
        flt(doc.get("selling")) == 1
        and is_margin_enabled_price_list(doc.get("price_list"))
        and flt(doc.get("custom_auto_margin_managed")) == 1
        and flt(doc.get("custom_manual_price_override")) == 0
        and doc.has_value_changed("price_list_rate")
        and not getattr(frappe.flags, "custom_auto_margin_sync", False)
    ):
        # User changed an auto-managed selling price; preserve their override.
        frappe.db.set_value(
            "Item Price",
            doc.name,
            {
                "custom_manual_price_override": 1,
                "custom_auto_margin_managed": 0,
            },
        )

    if flt(doc.get("buying")) == 1:
        sync_margin_based_selling_prices(doc.item_code)
    sync_item_standard_rate(doc.item_code)


def on_item_price_trash(doc, method=None):
    """Re-sync after deleting a price row."""
    if flt(doc.get("buying")) == 1:
        sync_margin_based_selling_prices(doc.item_code)
    sync_item_standard_rate(doc.item_code)
