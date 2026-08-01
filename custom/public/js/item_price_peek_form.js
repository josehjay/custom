(() => {
	const CHILD_FIELD = "items";
	const BTN_CLASS = "custom-price-peek-btn";

	function getSellingPriceList(frm) {
		return frm?.doc?.selling_price_list || frm?.doc?.price_list || null;
	}

	function ensurePeekLib(callback) {
		if (window.custom_item_price_peek) {
			callback();
			return;
		}
		frappe.require("/assets/custom/js/item_price_peek.js", callback);
	}

	function findRateCell(gridRow) {
		if (!gridRow?.wrapper?.length) return null;

		const $rateControl = gridRow.wrapper
			.find('.grid-static-col[data-fieldname="rate"], .frappe-control[data-fieldname="rate"]')
			.first();
		if ($rateControl.length) return $rateControl;

		const $priceListRate = gridRow.wrapper
			.find(
				'.grid-static-col[data-fieldname="price_list_rate"], .frappe-control[data-fieldname="price_list_rate"]'
			)
			.first();
		if ($priceListRate.length) return $priceListRate;

		return null;
	}

	function decorateGridRow(frm, gridRow) {
		if (!gridRow?.doc?.item_code) return;

		const $cell = findRateCell(gridRow);
		if (!$cell?.length) return;

		let $host = $cell.find(".custom-price-peek-host");
		if (!$host.length) {
			$host = $('<span class="custom-price-peek-host custom-price-peek-inline"></span>');
			const $static = $cell.find(".static-area, .control-value, .like-disabled-input").first();
			if ($static.length) {
				$static.css({ display: "inline-flex", alignItems: "center", gap: "4px" });
				$static.append($host);
			} else {
				$cell.append($host);
			}
		}

		$host.find(`.${BTN_CLASS}`).remove();
		window.custom_item_price_peek.attachTo($host.get(0), gridRow.doc.item_code, {
			priceList: getSellingPriceList(frm),
			uom: gridRow.doc.uom || gridRow.doc.stock_uom || null,
		});
	}

	function decorateAllRows(frm) {
		ensurePeekLib(() => {
			const grid = frm?.fields_dict?.[CHILD_FIELD]?.grid;
			if (!grid) return;

			window.custom_item_price_peek.injectStyles();
			(grid.grid_rows || []).forEach((row) => decorateGridRow(frm, row));
		});
	}

	function bindGrid(frm) {
		const grid = frm?.fields_dict?.[CHILD_FIELD]?.grid;
		if (!grid || grid.__custom_price_peek_bound) return;
		grid.__custom_price_peek_bound = true;

		frm.$wrapper
			.off("mouseenter.customPricePeek")
			.on("mouseenter.customPricePeek", `.form-grid .grid-row`, function () {
				const rowName = $(this).attr("data-name");
				const gridRow = grid.grid_rows_by_docname?.[rowName];
				if (gridRow) {
					ensurePeekLib(() => decorateGridRow(frm, gridRow));
				}
			});
	}

	function setupForm(frm) {
		bindGrid(frm);
		decorateAllRows(frm);
	}

	["Sales Order", "Sales Invoice", "Quotation", "POS Invoice"].forEach((doctype) => {
		frappe.ui.form.on(doctype, {
			refresh(frm) {
				setupForm(frm);
			},
			selling_price_list(frm) {
				decorateAllRows(frm);
			},
			items_add(frm) {
				setTimeout(() => decorateAllRows(frm), 50);
			},
			items_remove(frm) {
				setTimeout(() => decorateAllRows(frm), 50);
			},
		});

		frappe.ui.form.on(`${doctype} Item`, {
			item_code(frm, cdt, cdn) {
				const row = locals[cdt]?.[cdn];
				const grid = frm.fields_dict?.[CHILD_FIELD]?.grid;
				const gridRow = grid?.grid_rows_by_docname?.[cdn];
				if (row?.item_code && gridRow) {
					ensurePeekLib(() => decorateGridRow(frm, gridRow));
				} else {
					decorateAllRows(frm);
				}
			},
		});
	});
})();
