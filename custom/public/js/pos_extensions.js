(() => {
	// Ensure POS always loads price-peek before the ItemSelector patch.
	const files = ["/assets/custom/js/item_price_peek.js", "/assets/custom/js/custom_pos_list_view.js"];
	if (typeof frappe?.require === "function") {
		frappe.require(files);
	}
})();
