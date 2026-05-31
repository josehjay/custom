import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    custom_fields = {
        "Item Price": [
            {
                "fieldname": "custom_pricing_automation_section",
                "label": "Pricing Automation",
                "fieldtype": "Section Break",
                "insert_after": "packing_unit",
            },
            {
                "fieldname": "custom_manual_price_override",
                "label": "Manual Price Override",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "custom_pricing_automation_section",
                "description": (
                    "If checked, auto-margin pricing will not overwrite this item price."
                ),
            },
            {
                "fieldname": "custom_auto_margin_managed",
                "label": "Auto Margin Managed",
                "fieldtype": "Check",
                "default": "0",
                "read_only": 1,
                "hidden": 1,
                "insert_after": "custom_manual_price_override",
            },
        ]
    }

    create_custom_fields(custom_fields, update=True)
    frappe.clear_cache(doctype="Item Price")
