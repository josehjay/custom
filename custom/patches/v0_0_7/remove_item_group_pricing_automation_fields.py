import frappe


def execute():
    fields_to_remove = [
        "Item Group-custom_buying_margin_percent",
        "Item Group-custom_pricing_automation_section",
    ]

    for field_name in fields_to_remove:
        if frappe.db.exists("Custom Field", field_name):
            frappe.delete_doc("Custom Field", field_name, force=1, ignore_permissions=True)

    frappe.clear_cache(doctype="Item Group")
