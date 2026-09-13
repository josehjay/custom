import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
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
			{
				"fieldname": "show_other_pricelists_in_pos",
				"label": "Show Other Price Lists",
				"fieldtype": "Check",
				"default": "1",
				"insert_after": "use_custom_list_view_with_images",
				"description": "Show other selling price lists on POS item cards.",
			},
		]
	}
	create_custom_fields(custom_fields, update=True)

	# Existing profiles would otherwise keep the Check as 0; turn peek on by default.
	if "show_other_pricelists_in_pos" in frappe.db.get_table_columns("POS Profile"):
		frappe.db.sql("update `tabPOS Profile` set show_other_pricelists_in_pos = 1")

	frappe.clear_cache(doctype="POS Profile")
