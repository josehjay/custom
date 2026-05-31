import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    custom_fields = {
        "Price List": [
            {
                "fieldname": "custom_pricing_automation_section",
                "label": "Pricing Automation",
                "fieldtype": "Section Break",
                "insert_after": "enabled",
            },
            {
                "fieldname": "custom_auto_price_from_buying",
                "label": "Auto Price From Buying",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "custom_pricing_automation_section",
                "description": (
                    "Auto-generate Item Price for this selling price list "
                    "from buying price + margin."
                ),
            },
            {
                "fieldname": "custom_buying_margin_percent",
                "label": "Buying Margin %",
                "fieldtype": "Percent",
                "default": "0",
                "insert_after": "custom_auto_price_from_buying",
                "depends_on": "eval:doc.custom_auto_price_from_buying==1",
            },
            {
                "fieldname": "custom_buying_source_price_list",
                "label": "Buying Source Price List",
                "fieldtype": "Link",
                "options": "Price List",
                "insert_after": "custom_buying_margin_percent",
                "depends_on": "eval:doc.custom_auto_price_from_buying==1",
                "description": (
                    "Optional. If blank, system uses Buying Settings default buying price list."
                ),
            },
        ]
    }

    create_custom_fields(custom_fields, update=True)
    frappe.clear_cache(doctype="Price List")
