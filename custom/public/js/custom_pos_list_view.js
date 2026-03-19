(() => {
	const STYLE_ID = "custom-pos-list-view-style";
	const PATCH_KEY = "__custom_pos_list_with_images_patched";
	const ENABLE_FIELD = "use_custom_list_view_with_images";
	const POLL_INTERVAL_MS = 200;
	const MAX_WAIT_MS = 20000;
	const VIEW_MODE_KEY = "__custom_pos_view_mode";
	const LAST_ITEMS_KEY = "__custom_pos_last_items";
	const ITEMS_SIGNATURE_KEY = "__custom_pos_items_signature";
	const CURRENT_PAGE_KEY = "__custom_pos_current_page";
	const PAGE_SIZE_KEY = "__custom_pos_page_size";
	const ENABLE_STATE_KEY = "__custom_pos_enable_state";
	const ENABLE_FETCH_PROMISE_KEY = "__custom_pos_enable_fetch_promise";
	const DEFAULT_PAGE_SIZE = 24;
	const profileEnableCache = {};

	function injectStyles() {
		if (document.getElementById(STYLE_ID)) return;

		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = `
			.items-container.custom-pos-list-view {
				display: flex !important;
				flex-direction: column;
				gap: 0;
				padding: 0 !important;
				margin-top: 0 !important;
				position: relative;
				isolation: isolate;
			}

			.custom-pos-list-header,
			.custom-pos-list-item {
				display: grid;
				grid-template-columns: 56px minmax(320px, 2.2fr) minmax(100px, 0.7fr) minmax(70px, 0.45fr) minmax(100px, 0.65fr);
				align-items: center;
				column-gap: 10px;
				padding: 8px 10px;
				margin-left: 8px;
				margin-right: 8px;
				border-bottom: 1px solid var(--border-color);
			}

			.custom-pos-list-header {
				position: sticky;
				top: 0 !important;
				background: var(--bg-color, #111827) !important;
				z-index: 300;
				font-size: var(--text-xs);
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.02em;
				border-bottom: 1px solid var(--border-color);
				box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
				margin-top: 0 !important;
				isolation: isolate;
			}

			.custom-pos-list-item {
				cursor: pointer;
				background: var(--bg-color);
				position: relative;
				z-index: 1;
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

			.custom-pos-price-cell {
				font-weight: 700;
				color: var(--text-color, #f8fafc);
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
					grid-template-columns: 52px minmax(240px, 2fr) minmax(90px, 0.7fr) minmax(60px, 0.45fr) minmax(90px, 0.6fr);
					column-gap: 8px;
				}
			}

			.custom-pos-view-switch {
				display: inline-flex;
				align-items: center;
				gap: 2px;
				padding: 2px;
				margin-left: 6px;
				margin-right: 0;
				border: 1px solid var(--border-color);
				border-radius: 8px;
				background: var(--subtle-fg);
				flex-shrink: 0;
			}

			.items-container.custom-pos-list-view > .custom-pos-list-header {
				margin-top: 0 !important;
			}

			.custom-pos-view-switch .view-btn {
				width: 34px;
				height: 30px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				border: 0;
				border-radius: 6px;
				background: transparent;
				color: var(--text-muted);
				font-size: 16px;
				font-weight: 700;
				line-height: 1;
				cursor: pointer;
			}

			.custom-pos-view-switch .view-btn.is-active {
				background: var(--primary);
				color: #fff;
			}

			.custom-pos-pagination-wrap {
				display: flex;
				align-items: center;
				justify-content: flex-end;
				gap: 8px;
				padding: 8px 10px;
				border-top: 1px solid var(--border-color);
				background: var(--subtle-fg);
				position: sticky;
				bottom: 0;
				z-index: 2;
			}

			.custom-pos-toggle-anchor {
				display: inline-flex;
				align-items: center;
				gap: 6px;
			}

			.custom-pos-toggle-anchor .control-label,
			.custom-pos-toggle-anchor label {
				width: auto !important;
				min-width: auto !important;
				margin: 0 !important;
				white-space: nowrap;
				font-size: var(--text-xs);
				grid-column: span 3 / span 3 !important;
			}

			.custom-pos-toggle-anchor .control-input,
			.custom-pos-toggle-anchor .control-input-wrapper,
			.custom-pos-toggle-anchor .control-value,
			.custom-pos-toggle-anchor .awesomplete,
			.custom-pos-toggle-anchor input,
			.custom-pos-toggle-anchor select {
				min-width: 110px;
				grid-column: span 9 / span 9 !important;
			}

			.custom-pos-pagination-wrap .page-info {
				font-size: var(--text-sm);
				color: var(--text-muted);
				min-width: 140px;
				text-align: center;
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
		maybeResolveEnableState(instance);
		maybeFetchEnableState(instance);
		return normalizeBool(instance?.[ENABLE_STATE_KEY]);
	}

	function normalizeBool(value) {
		return value === 1 || value === "1" || value === true || value === "true";
	}

	function getPosProfileName(instance) {
		return (
			instance?.settings?.pos_profile ||
			instance?.pos_profile?.name ||
			(typeof instance?.pos_profile === "string" ? instance.pos_profile : null) ||
			instance?.events?.get_frm?.doc?.pos_profile ||
			null
		);
	}

	function maybeResolveEnableState(instance) {
		const valueFromRuntime =
			instance?.settings?.[ENABLE_FIELD] ??
			instance?.pos_profile?.[ENABLE_FIELD] ??
			instance?.events?.get_frm?.doc?.[ENABLE_FIELD] ??
			null;

		if (valueFromRuntime !== null && valueFromRuntime !== undefined) {
			instance[ENABLE_STATE_KEY] = normalizeBool(valueFromRuntime);
			return;
		}

		const profileName = getPosProfileName(instance);
		if (profileName && profileEnableCache[profileName] !== undefined) {
			instance[ENABLE_STATE_KEY] = profileEnableCache[profileName];
		}
	}

	function maybeFetchEnableState(instance) {
		const profileName = getPosProfileName(instance);
		if (!profileName || profileEnableCache[profileName] !== undefined) return;
		if (instance?.[ENABLE_FETCH_PROMISE_KEY]) return;
		if (!frappe?.db?.get_value) return;

		instance[ENABLE_FETCH_PROMISE_KEY] = frappe.db
			.get_value("POS Profile", profileName, ENABLE_FIELD)
			.then((response) => {
				const value = response?.message?.[ENABLE_FIELD];
				const enabled = normalizeBool(value);
				profileEnableCache[profileName] = enabled;
				instance[ENABLE_STATE_KEY] = enabled;
				if (typeof instance?.render_item_list === "function") {
					instance.render_item_list(instance[LAST_ITEMS_KEY] || []);
				}
			})
			.catch(() => {
				profileEnableCache[profileName] = false;
				instance[ENABLE_STATE_KEY] = false;
			})
			.finally(() => {
				instance[ENABLE_FETCH_PROMISE_KEY] = null;
			});
	}

	function getCurrentViewMode(instance) {
		if (instance?.[VIEW_MODE_KEY] !== "grid" && instance?.[VIEW_MODE_KEY] !== "list") {
			instance[VIEW_MODE_KEY] = "grid";
		}
		return instance[VIEW_MODE_KEY];
	}

	function setCurrentViewMode(instance, mode) {
		instance[VIEW_MODE_KEY] = mode === "grid" ? "grid" : "list";
	}

	function getCurrentPage(instance) {
		if (!Number.isInteger(instance?.[CURRENT_PAGE_KEY]) || instance[CURRENT_PAGE_KEY] < 1) {
			instance[CURRENT_PAGE_KEY] = 1;
		}
		return instance[CURRENT_PAGE_KEY];
	}

	function setCurrentPage(instance, page) {
		const nextPage = Number.isInteger(page) && page > 0 ? page : 1;
		instance[CURRENT_PAGE_KEY] = nextPage;
	}

	function getPageSize(instance) {
		if (!Number.isInteger(instance?.[PAGE_SIZE_KEY]) || instance[PAGE_SIZE_KEY] < 1) {
			instance[PAGE_SIZE_KEY] = DEFAULT_PAGE_SIZE;
		}
		return instance[PAGE_SIZE_KEY];
	}

	function buildItemsSignature(items) {
		const firstCode = items?.[0]?.item_code || "";
		const lastCode = items?.[items.length - 1]?.item_code || "";
		return `${items?.length || 0}:${firstCode}:${lastCode}`;
	}

	function getPaginatedItems(instance, items) {
		const pageSize = getPageSize(instance);
		const totalItems = items.length;
		const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
		const safePage = Math.min(getCurrentPage(instance), totalPages);
		setCurrentPage(instance, safePage);
		const start = (safePage - 1) * pageSize;
		return {
			pageItems: items.slice(start, start + pageSize),
			totalPages,
			currentPage: safePage,
			totalItems,
		};
	}

	function getSelectorRoot(instance) {
		const $container = instance?.$items_container;
		if (!$container?.length) return null;
		const $root = $container.closest(".items-selector, .item-selector, .point-of-sale-app");
		return $root.length ? $root : $container.parent();
	}

	function findToggleAnchor(instance) {
		const $root = getSelectorRoot(instance);
		if (!$root?.length) return null;

		const $itemGroupControl = $root
			.find(
				'[data-fieldname="item_group"], .item-group-field, .frappe-control[data-fieldname="item_group"], input[placeholder*="item group"], input[placeholder*="Item group"]'
			)
			.first();
		if ($itemGroupControl.length) {
			const $controlWrap = $itemGroupControl.closest(
				'.frappe-control, .item-group-field, .form-group, .control-input-wrapper, .col, [data-fieldname="item_group"]'
			);
			if ($controlWrap.length) return $controlWrap;
			return $itemGroupControl;
		}

		const $searchRow = $root.find(".items-selector-header, .item-selector-header, .item-search").first();
		if ($searchRow.length) return $searchRow;
		return null;
	}

	function ensureViewToggle(instance) {
		const $container = instance?.$items_container;
		if (!$container?.length) return;

		const $anchor = findToggleAnchor(instance);
		if (!$anchor?.length) return;
		const $root = getSelectorRoot(instance) || $container.parent();
		let $wrap = $root.find(".custom-pos-view-switch");
		if (!$wrap.length) {
			$wrap = $(
				`<div class="custom-pos-view-switch" role="group" aria-label="${__("View mode")}">
					<button type="button" class="view-btn view-btn-grid" title="${__("Grid view")}" aria-label="${__("Grid view")}">▦</button>
					<button type="button" class="view-btn view-btn-list" title="${__("List view")}" aria-label="${__("List view")}">≡</button>
				</div>`
			);
			$anchor.after($wrap);
		}
		$anchor.addClass("custom-pos-toggle-anchor");

		const viewMode = getCurrentViewMode(instance);
		const $gridBtn = $wrap.find(".view-btn-grid");
		const $listBtn = $wrap.find(".view-btn-list");
		$gridBtn.toggleClass("is-active", viewMode === "grid");
		$listBtn.toggleClass("is-active", viewMode === "list");

		$gridBtn.off("click.customPosViewToggle").on("click.customPosViewToggle", () => {
			setCurrentViewMode(instance, "grid");
			setCurrentPage(instance, 1);
			instance.render_item_list(instance[LAST_ITEMS_KEY] || []);
		});
		$listBtn.off("click.customPosViewToggle").on("click.customPosViewToggle", () => {
			setCurrentViewMode(instance, "list");
			setCurrentPage(instance, 1);
			instance.render_item_list(instance[LAST_ITEMS_KEY] || []);
		});
	}

	function enforceFilterGridColumns(instance) {
		const $root = getSelectorRoot(instance);
		if (!$root?.length) return;

		const $itemGroupControl = $root
			.find('[data-fieldname="item_group"], .frappe-control[data-fieldname="item_group"], .item-group-field')
			.first();
		if (!$itemGroupControl.length) return;

		const labelNodes = $itemGroupControl.find(".control-label, label").toArray();
		const inputNodes = $itemGroupControl
			.find(".control-input, .control-input-wrapper, .control-value, .awesomplete, input, select")
			.toArray();

		labelNodes.forEach((node) => {
			node.style.setProperty("grid-column", "span 3 / span 3", "important");
			node.style.setProperty("width", "auto", "important");
			node.style.setProperty("min-width", "auto", "important");
		});

		inputNodes.forEach((node) => {
			node.style.setProperty("grid-column", "span 9 / span 9", "important");
		});
	}

	function ensurePaginationControls(instance, totalItems, totalPages, currentPage) {
		const $container = instance?.$items_container;
		if (!$container?.length) return;

		const $parent = $container.parent();
		if (!$parent?.length) return;

		let $pager = $parent.find(".custom-pos-pagination-wrap");
		if (!$pager.length) {
			$pager = $(
				`<div class="custom-pos-pagination-wrap">
					<button type="button" class="btn btn-xs btn-default custom-pos-prev-page">${__("Previous")}</button>
					<span class="page-info"></span>
					<button type="button" class="btn btn-xs btn-default custom-pos-next-page">${__("Next")}</button>
				</div>`
			);
			$container.after($pager);
		}

		$pager.find(".page-info").text(__("Page {0} of {1} ({2} items)", [currentPage, totalPages, totalItems]));
		$pager.find(".custom-pos-prev-page").prop("disabled", currentPage <= 1);
		$pager.find(".custom-pos-next-page").prop("disabled", currentPage >= totalPages);

		$pager.find(".custom-pos-prev-page").off("click.customPosPager").on("click.customPosPager", () => {
			setCurrentPage(instance, Math.max(1, getCurrentPage(instance) - 1));
			instance.render_item_list(instance[LAST_ITEMS_KEY] || []);
		});
		$pager.find(".custom-pos-next-page").off("click.customPosPager").on("click.customPosPager", () => {
			setCurrentPage(instance, getCurrentPage(instance) + 1);
			instance.render_item_list(instance[LAST_ITEMS_KEY] || []);
		});

		$pager.show();
	}

	function hidePaginationControls(instance) {
		const $container = instance?.$items_container;
		if (!$container?.length) return;
		$container.parent().find(".custom-pos-pagination-wrap").hide();
	}

	function removeCustomControls(instance) {
		const $container = instance?.$items_container;
		if (!$container?.length) return;
		const $root = getSelectorRoot(instance) || $container.parent();
		$root.find(".custom-pos-view-switch").remove();
		$container.parent().find(".custom-pos-pagination-wrap").remove();
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
			if (getCurrentViewMode(this) === "grid" && originalRenderItemListColumnHeader) {
				return originalRenderItemListColumnHeader.call(this);
			}

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
			if (getCurrentViewMode(this) === "grid" && originalGetItemHtml) {
				return originalGetItemHtml.call(this, item);
			}

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
			const safeItems = items || [];
			this[LAST_ITEMS_KEY] = safeItems;

			if (!isCustomListEnabled(this) && originalRenderItemList) {
				removeCustomControls(this);
				this.$items_container.removeClass("custom-pos-list-view");
				return originalRenderItemList.call(this, safeItems);
			}

			const nextSignature = buildItemsSignature(safeItems);
			if (this[ITEMS_SIGNATURE_KEY] !== nextSignature) {
				setCurrentPage(this, 1);
				this[ITEMS_SIGNATURE_KEY] = nextSignature;
			}

			ensureViewToggle(this);
			enforceFilterGridColumns(this);

			if (getCurrentViewMode(this) === "grid" && originalRenderItemList) {
				this.$items_container.html("");
				this.$items_container.removeClass("custom-pos-list-view");
				hidePaginationControls(this);
				return originalRenderItemList.call(this, safeItems);
			}

			const { pageItems, totalPages, currentPage, totalItems } = getPaginatedItems(this, safeItems);
			ensurePaginationControls(this, totalItems, totalPages, currentPage);

			this.$items_container.html("");

			if (!pageItems.length) {
				if (this.set_items_not_found_banner) this.set_items_not_found_banner();
				return;
			}

			if (this.$items_container.hasClass("items-not-found")) {
				this.$items_container.removeClass("items-not-found");
			}

			this.$items_container.addClass("custom-pos-list-view");
			this.$items_container.append(this.render_item_list_column_header());

			pageItems.forEach((item) => {
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
