import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    custom_fields = {
        "Price List": [
            {
                "fieldname": "custom_item_group_margin_section",
                "label": "Item Group Margin Overrides",
                "fieldtype": "Section Break",
                "insert_after": "custom_use_item_group_margins",
                "depends_on": "eval:doc.custom_auto_price_from_buying==1 && doc.custom_use_item_group_margins==1",
            },
            {
                "fieldname": "custom_item_group_margins",
                "label": "Item Group Margins",
                "fieldtype": "Table",
                "options": "Price List Item Group Margin",
                "insert_after": "custom_item_group_margin_section",
                "depends_on": "eval:doc.custom_auto_price_from_buying==1 && doc.custom_use_item_group_margins==1",
                "description": "Per-price-list margin by Item Group. Overrides default margin for matching groups.",
            },
        ]
    }

    create_custom_fields(custom_fields, update=True)
    frappe.clear_cache(doctype="Price List")
