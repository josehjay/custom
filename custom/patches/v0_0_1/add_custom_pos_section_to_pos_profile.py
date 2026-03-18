import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	custom_fields = {
		"POS Profile": [
			{
				"fieldname": "custom_pos_section",
				"label": "Custom POS",
				"fieldtype": "Section Break",
				"insert_after": "auto_add_item_to_cart",
			},
			{
				"fieldname": "use_custom_list_view_with_images",
				"label": "Use Custom List View with Images",
				"fieldtype": "Check",
				"default": "0",
				"insert_after": "custom_pos_section",
				"description": "Enable custom POS item list view with images.",
			},
		]
	}

	create_custom_fields(custom_fields, update=True)
	frappe.clear_cache(doctype="POS Profile")
