app_name = "custom"
app_title = "Custom"
app_publisher = "Bookspot"
app_description = "Custom ERPNext POS extensions"
app_email = "info@bookspot.co.ke"
app_license = "MIT"

required_apps = ["erpnext"]

page_js = {
    "point_of_sale": "public/js/pos_extensions.js",
    "point-of-sale": "public/js/pos_extensions.js",
}

doctype_js = {
    "Sales Order": "public/js/item_price_peek_form.js",
    "Sales Invoice": "public/js/item_price_peek_form.js",
    "Quotation": "public/js/item_price_peek_form.js",
    "POS Invoice": "public/js/item_price_peek_form.js",
}

# Desk-wide includes (forms + POS fallback). POS page also loads pos_extensions.js.
app_include_js = [
    "/assets/custom/js/item_price_peek.js",
    "/assets/custom/js/custom_pos_list_view.js",
    "/assets/custom/js/pos_extensions.js",
]

override_whitelisted_methods = {
    "erpnext.stock.get_item_details.get_item_details": (
        "custom.custom_extensions.item_standard_rate_sync.get_item_details_with_default_pricelist_fallback"
    )
}

doc_events = {
    "Item": {
        "validate": "custom.custom_extensions.item_standard_rate_sync.enforce_item_standard_rate",
        "after_insert": "custom.custom_extensions.item_standard_rate_sync.on_item_after_insert",
    },
    "Item Price": {
        "after_insert": "custom.custom_extensions.item_standard_rate_sync.on_item_price_change",
        "on_update": "custom.custom_extensions.item_standard_rate_sync.on_item_price_change",
        "on_trash": "custom.custom_extensions.item_standard_rate_sync.on_item_price_trash",
    },
    "Purchase Order": {
        "on_submit": "custom.custom_extensions.item_standard_rate_sync.clear_purchase_order_buying_cache",
        "on_cancel": "custom.custom_extensions.item_standard_rate_sync.clear_purchase_order_buying_cache",
        "on_update_after_submit": "custom.custom_extensions.item_standard_rate_sync.clear_purchase_order_buying_cache",
    },
}

fixtures = [
    {
        "dt": "Custom Field",
        "filters": [
            [
                "name",
                "in",
                [
                    "POS Profile-use_custom_list_view_with_images",
                ],
            ]
        ],
    }
]
