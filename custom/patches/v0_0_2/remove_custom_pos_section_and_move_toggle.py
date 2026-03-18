import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	# Ensure the toggle sits in the base POS Profile configuration area.
	custom_fields = {
		"POS Profile": [
			{
				"fieldname": "use_custom_list_view_with_images",
				"label": "Use Custom List View with Images",
				"fieldtype": "Check",
				"default": "0",
				"insert_after": "auto_add_item_to_cart",
				"description": "Enable custom POS item list view with images.",
			},
		]
	}
	create_custom_fields(custom_fields, update=True)

	# Remove legacy custom section field from older installs.
	legacy_field_name = "POS Profile-custom_pos_section"
	if frappe.db.exists("Custom Field", legacy_field_name):
		frappe.delete_doc("Custom Field", legacy_field_name, force=1, ignore_permissions=True)

	frappe.clear_cache(doctype="POS Profile")
