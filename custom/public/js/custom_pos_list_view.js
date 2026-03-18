(() => {
	const STYLE_ID = "custom-pos-list-view-style";
	const PATCH_KEY = "__custom_pos_list_with_images_patched";
	const ENABLE_FIELD = "use_custom_list_view_with_images";
	const POLL_INTERVAL_MS = 200;
	const MAX_WAIT_MS = 20000;
	const VIEW_MODE_KEY = "__custom_pos_view_mode";
	const LAST_ITEMS_KEY = "__custom_pos_last_items";

	function injectStyles() {
		if (document.getElementById(STYLE_ID)) return;

		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = `
			.items-container.custom-pos-list-view {
				display: flex !important;
				flex-direction: column;
				gap: 0;
				padding: 0;
			}

			.custom-pos-list-header,
			.custom-pos-list-item {
				display: grid;
				grid-template-columns: 64px minmax(220px, 1fr) minmax(110px, 0.6fr) minmax(90px, 0.4fr) minmax(130px, 0.5fr);
				align-items: center;
				column-gap: 10px;
				padding: 8px 10px;
				border-bottom: 1px solid var(--border-color);
			}

			.custom-pos-list-header {
				position: sticky;
				top: 0;
				background: var(--subtle-fg);
				z-index: 1;
				font-size: var(--text-xs);
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.02em;
			}

			.custom-pos-list-item {
				cursor: pointer;
				background: var(--bg-color);
			}

			.custom-pos-list-item:hover {
				background: var(--bg-light-gray);
			}

			.custom-pos-image-cell {
				width: 52px;
				height: 52px;
				border-radius: 8px;
				overflow: hidden;
				display: flex;
				align-items: center;
				justify-content: center;
				background: var(--fg-color);
				color: var(--gray-900);
				font-weight: 700;
				font-size: 12px;
			}

			.custom-pos-image-cell img {
				width: 100%;
				height: 100%;
				object-fit: cover;
				display: block;
			}

			.custom-pos-name-cell {
				min-width: 0;
				font-weight: 600;
			}

			.custom-pos-name-cell .item-code {
				display: block;
				margin-top: 2px;
				font-size: var(--text-xs);
				color: var(--text-muted);
				font-weight: 400;
			}

			.custom-pos-price-cell,
			.custom-pos-uom-cell,
			.custom-pos-qty-cell {
				white-space: nowrap;
				font-size: var(--text-sm);
			}

			.custom-pos-qty-cell.is-green {
				color: var(--green-600);
			}

			.custom-pos-qty-cell.is-orange {
				color: var(--orange-600);
			}

			.custom-pos-qty-cell.is-red {
				color: var(--red-500);
			}

			@media (max-width: 1200px) {
				.custom-pos-list-header,
				.custom-pos-list-item {
					grid-template-columns: 56px minmax(180px, 1fr) minmax(95px, 0.6fr) minmax(80px, 0.35fr) minmax(100px, 0.4fr);
					column-gap: 8px;
				}
			}

			.custom-pos-view-toggle-wrap {
				display: flex;
				justify-content: flex-end;
				padding: 6px 8px;
				background: var(--subtle-fg);
				border-bottom: 1px solid var(--border-color);
			}
		`;

		document.head.appendChild(style);
	}

	function formatQty(actualQty) {
		let qty = actualQty;
		if (Math.round(qty) > 999) {
			qty = Math.round(qty) / 1000;
			return `${qty.toFixed(1)}K`;
		}
		return qty;
	}

	function getQtyMeta(item) {
		if (!item.is_stock_item) {
			return { text: __("Non stock item"), cssClass: "" };
		}

		const qty = formatQty(item.actual_qty || 0);
		const cssClass = item.actual_qty > 10 ? "is-green" : item.actual_qty <= 0 ? "is-red" : "is-orange";
		return { text: qty, cssClass };
	}

	function makeImageCell(item) {
		const abbr = frappe.get_abbr(item.item_name || item.item_code || "");
		if (item.item_image) {
			return `
				<div class="custom-pos-image-cell">
					<img src="${item.item_image}" alt="${abbr}" />
				</div>
			`;
		}

		return `<div class="custom-pos-image-cell">${abbr}</div>`;
	}

	function isCustomListEnabled(instance) {
		const value =
			instance?.settings?.[ENABLE_FIELD] ??
			instance?.pos_profile?.[ENABLE_FIELD] ??
			instance?.events?.get_frm?.doc?.[ENABLE_FIELD] ??
			frappe?.boot?.[ENABLE_FIELD];
		return value === 1 || value === "1" || value === true;
	}

	function getCurrentViewMode(instance) {
		if (instance?.[VIEW_MODE_KEY] !== "grid" && instance?.[VIEW_MODE_KEY] !== "list") {
			instance[VIEW_MODE_KEY] = isCustomListEnabled(instance) ? "list" : "grid";
		}
		return instance[VIEW_MODE_KEY];
	}

	function setCurrentViewMode(instance, mode) {
		instance[VIEW_MODE_KEY] = mode === "grid" ? "grid" : "list";
	}

	function ensureViewToggle(instance) {
		const $container = instance?.$items_container;
		if (!$container?.length) return;

		const $parent = $container.parent();
		if (!$parent?.length) return;

		let $wrap = $parent.find(".custom-pos-view-toggle-wrap");
		if (!$wrap.length) {
			$wrap = $(
				`<div class="custom-pos-view-toggle-wrap">
					<button type="button" class="btn btn-xs btn-secondary custom-pos-view-toggle-btn"></button>
				</div>`
			);
			$container.before($wrap);
		}

		const viewMode = getCurrentViewMode(instance);
		const isListMode = viewMode === "list";
		const buttonLabel = isListMode ? __("Switch to Grid View") : __("Switch to List View");
		const $button = $wrap.find(".custom-pos-view-toggle-btn");
		$button.text(buttonLabel);

		$button.off("click.customPosViewToggle").on("click.customPosViewToggle", () => {
			setCurrentViewMode(instance, isListMode ? "grid" : "list");
			instance.render_item_list(instance[LAST_ITEMS_KEY] || []);
		});
	}

	function patchItemSelector() {
		const ItemSelector = erpnext?.PointOfSale?.ItemSelector;
		if (!ItemSelector || !ItemSelector.prototype) return false;
		if (ItemSelector.prototype[PATCH_KEY]) return true;

		injectStyles();
		const originalRenderItemListColumnHeader = ItemSelector.prototype.render_item_list_column_header;
		const originalGetItemHtml = ItemSelector.prototype.get_item_html;
		const originalRenderItemList = ItemSelector.prototype.render_item_list;

		ItemSelector.prototype.render_item_list_column_header = function () {
			return `
				<div class="custom-pos-list-header">
					<div>${__("Image")}</div>
					<div>${__("Name")}</div>
					<div>${__("Price")}</div>
					<div>${__("UOM")}</div>
					<div>${__("Quantity Available")}</div>
				</div>
			`;
		};

		ItemSelector.prototype.get_item_html = function (item) {
			const { serial_no, batch_no } = item;
			const uom = item.uom || item.stock_uom || "";
			const priceListRate = item.price_list_rate || 0;
			const precision = flt(priceListRate, 2) % 1 !== 0 ? 2 : 0;
			const qtyMeta = getQtyMeta(item);

			return `
				<div
					class="item-wrapper custom-pos-list-item"
					data-item-code="${escape(item.item_code)}"
					data-serial-no="${escape(serial_no)}"
					data-batch-no="${escape(batch_no)}"
					data-uom="${escape(uom)}"
					data-rate="${escape(priceListRate)}"
					data-stock-uom="${escape(item.stock_uom)}"
					title="${item.item_name || item.item_code}"
				>
					${makeImageCell(item)}
					<div class="custom-pos-name-cell">
						${item.item_name || item.item_code}
						<span class="item-code">${item.item_code}</span>
					</div>
					<div class="custom-pos-price-cell">
						${format_currency(priceListRate, item.currency, precision) || 0}
					</div>
					<div class="custom-pos-uom-cell">${uom}</div>
					<div class="custom-pos-qty-cell ${qtyMeta.cssClass}">
						${qtyMeta.text}
					</div>
				</div>
			`;
		};

		ItemSelector.prototype.render_item_list = function (items) {
			this[LAST_ITEMS_KEY] = items || [];
			ensureViewToggle(this);
			if (getCurrentViewMode(this) === "grid" && originalRenderItemList) {
				this.$items_container.removeClass("custom-pos-list-view");
				return originalRenderItemList.call(this, items);
			}

			this.$items_container.html("");

			if (!items?.length) {
				if (this.set_items_not_found_banner) this.set_items_not_found_banner();
				return;
			}

			if (this.$items_container.hasClass("items-not-found")) {
				this.$items_container.removeClass("items-not-found");
			}

			this.$items_container.removeClass("hide-item-image show-item-image");
			this.$items_container.addClass("custom-pos-list-view");
			this.$items_container.append(this.render_item_list_column_header());

			items.forEach((item) => {
				this.$items_container.append(this.get_item_html(item));
			});
		};

		ItemSelector.prototype[PATCH_KEY] = true;
		return true;
	}

	function initializePatch() {
		const startAt = Date.now();
		const timer = setInterval(() => {
			const patched = patchItemSelector();
			const timedOut = Date.now() - startAt > MAX_WAIT_MS;
			if (patched || timedOut) {
				clearInterval(timer);
			}
		}, POLL_INTERVAL_MS);
	}

	initializePatch();
})();
