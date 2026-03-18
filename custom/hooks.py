app_name = "custom"
app_title = "Custom"
app_publisher = "Bookspot"
app_description = "Custom ERPNext POS extensions"
app_email = "info@bookspot.co.ke"
app_license = "MIT"

required_apps = ["erpnext"]

page_js = {
    "point_of_sale": "public/js/custom_pos_list_view.js",
    "point-of-sale": "public/js/custom_pos_list_view.js",
}

# Fallback include to ensure POS patch is loaded across route variants/builds.
app_include_js = "/assets/custom/js/custom_pos_list_view.js"

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
