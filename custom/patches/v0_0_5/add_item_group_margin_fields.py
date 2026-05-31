import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    custom_fields = {
        "Price List": [
            {
                "fieldname": "custom_use_item_group_margins",
                "label": "Use Item Group Margins",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "custom_buying_margin_percent",
                "depends_on": "eval:doc.custom_auto_price_from_buying==1",
                "description": (
                    "When enabled, selling margin is read from the item's Item Group margin."
                ),
            },
        ],
        "Item Group": [
            {
                "fieldname": "custom_pricing_automation_section",
                "label": "Pricing Automation",
                "fieldtype": "Section Break",
                "insert_after": "show_in_website",
            },
            {
                "fieldname": "custom_buying_margin_percent",
                "label": "Buying Margin %",
                "fieldtype": "Percent",
                "insert_after": "custom_pricing_automation_section",
                "description": (
                    "Override margin for items in this group when price list uses item group margins."
                ),
            },
        ],
    }

    create_custom_fields(custom_fields, update=True)
    frappe.clear_cache(doctype="Price List")
    frappe.clear_cache(doctype="Item Group")
