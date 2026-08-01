(() => {
	const STYLE_ID = "custom-item-price-peek-style";
	const POPOVER_ID = "custom-item-price-peek-popover";
	const CACHE = new Map();
	const CACHE_TTL_MS = 60 * 1000;
	let hideTimer = null;
	let activeAnchor = null;

	function injectStyles() {
		if (document.getElementById(STYLE_ID)) return;

		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = `
			.custom-price-peek-btn {
				display: inline-flex !important;
				align-items: center;
				justify-content: center;
				width: 22px;
				height: 22px;
				min-width: 22px;
				margin-left: 6px;
				padding: 0;
				border: 1px solid var(--gray-400, #98a2b3);
				border-radius: 999px;
				background: var(--fg-color, #fff);
				color: var(--primary-color, var(--primary, #171717));
				cursor: pointer;
				vertical-align: middle;
				line-height: 1;
				flex-shrink: 0;
				position: relative;
				z-index: 5;
				box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
				transition: color 0.12s ease, border-color 0.12s ease, background 0.12s ease;
			}

			.custom-price-peek-btn:hover,
			.custom-price-peek-btn.is-open {
				color: #fff;
				border-color: var(--primary-color, var(--primary, #171717));
				background: var(--primary-color, var(--primary, #171717));
			}

			.custom-price-peek-btn .peek-icon {
				font-size: 12px;
				font-weight: 700;
				font-style: normal;
				pointer-events: none;
			}

			/* POS cards often use overflow:hidden — keep the icon visible */
			.item-wrapper .custom-price-peek-btn,
			.custom-pos-list-item .custom-price-peek-btn {
				opacity: 1;
				visibility: visible;
			}

			.custom-price-peek-popover {
				position: fixed;
				z-index: 1100;
				min-width: 280px;
				max-width: 360px;
				padding: 0;
				border: 1px solid var(--border-color);
				border-radius: var(--border-radius-md, 8px);
				background: var(--fg-color, var(--card-bg, #fff));
				box-shadow: var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.12));
				overflow: hidden;
			}

			.custom-price-peek-popover .peek-header {
				display: flex;
				align-items: flex-start;
				justify-content: space-between;
				gap: 8px;
				padding: 10px 12px;
				border-bottom: 1px solid var(--border-color);
				background: var(--subtle-fg, var(--bg-light-gray, #f8f8f8));
			}

			.custom-price-peek-popover .peek-title {
				font-size: var(--text-sm, 13px);
				font-weight: 600;
				color: var(--text-color);
				line-height: 1.3;
			}

			.custom-price-peek-popover .peek-subtitle {
				margin-top: 2px;
				font-size: var(--text-xs, 11px);
				color: var(--text-muted);
				font-weight: 400;
			}

			.custom-price-peek-popover .peek-close {
				border: 0;
				background: transparent;
				color: var(--text-muted);
				cursor: pointer;
				padding: 0 2px;
				font-size: 16px;
				line-height: 1;
			}

			.custom-price-peek-popover .peek-body {
				max-height: 260px;
				overflow: auto;
				padding: 4px 0;
			}

			.custom-price-peek-popover .peek-empty,
			.custom-price-peek-popover .peek-loading,
			.custom-price-peek-popover .peek-error {
				padding: 16px 12px;
				font-size: var(--text-sm, 13px);
				color: var(--text-muted);
				text-align: center;
			}

			.custom-price-peek-popover .peek-error {
				color: var(--red-500, #e24c4c);
			}

			.custom-price-peek-popover table {
				width: 100%;
				border-collapse: collapse;
				margin: 0;
			}

			.custom-price-peek-popover th,
			.custom-price-peek-popover td {
				padding: 7px 12px;
				font-size: var(--text-sm, 12px);
				text-align: left;
				vertical-align: middle;
				border-bottom: 1px solid var(--border-color);
			}

			.custom-price-peek-popover th {
				font-size: var(--text-xs, 11px);
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.02em;
				color: var(--text-muted);
				background: transparent;
			}

			.custom-price-peek-popover tr:last-child td {
				border-bottom: 0;
			}

			.custom-price-peek-popover tr.is-current td {
				background: var(--bg-blue-light, rgba(37, 99, 235, 0.08));
			}

			.custom-price-peek-popover .peek-rate {
				font-weight: 600;
				white-space: nowrap;
				text-align: right;
			}

			.custom-price-peek-popover .peek-badge {
				display: inline-block;
				margin-left: 6px;
				padding: 1px 6px;
				border-radius: 999px;
				font-size: 10px;
				font-weight: 600;
				line-height: 1.4;
				background: var(--bg-color);
				color: var(--text-muted);
				border: 1px solid var(--border-color);
			}

			.custom-price-peek-popover .peek-badge.is-current {
				color: var(--primary);
				border-color: var(--primary);
			}

			.custom-price-peek-popover .peek-buying {
				padding: 10px 12px;
				border-bottom: 1px solid var(--border-color);
				background: var(--subtle-fg, var(--bg-light-gray, #f8f8f8));
			}

			.custom-price-peek-popover .peek-buying-label {
				font-size: var(--text-xs, 11px);
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.02em;
				color: var(--text-muted);
				margin-bottom: 4px;
			}

			.custom-price-peek-popover .peek-buying-row {
				display: flex;
				align-items: baseline;
				justify-content: space-between;
				gap: 10px;
			}

			.custom-price-peek-popover .peek-buying-rate {
				font-size: var(--text-md, 14px);
				font-weight: 700;
				color: var(--text-color);
				white-space: nowrap;
			}

			.custom-price-peek-popover .peek-buying-meta {
				font-size: var(--text-xs, 11px);
				color: var(--text-muted);
				line-height: 1.35;
				text-align: right;
			}

			.custom-price-peek-inline {
				display: inline-flex;
				align-items: center;
				gap: 0;
			}
		`;
		document.head.appendChild(style);
	}

	function escapeHtml(value) {
		return frappe.utils.escape_html(String(value ?? ""));
	}

	function formatRate(rate, currency) {
		try {
			return format_currency(flt(rate), currency);
		} catch (e) {
			return String(rate ?? 0);
		}
	}

	function getCacheKey(itemCode, priceList, uom) {
		return `${itemCode}::${priceList || ""}::${uom || ""}`;
	}

	function readCache(itemCode, priceList, uom) {
		const key = getCacheKey(itemCode, priceList, uom);
		const entry = CACHE.get(key);
		if (!entry) return null;
		if (Date.now() - entry.at > CACHE_TTL_MS) {
			CACHE.delete(key);
			return null;
		}
		return entry.data;
	}

	function writeCache(itemCode, priceList, uom, data) {
		CACHE.set(getCacheKey(itemCode, priceList, uom), { at: Date.now(), data });
	}

	function getPopover() {
		let el = document.getElementById(POPOVER_ID);
		if (el) return el;

		el = document.createElement("div");
		el.id = POPOVER_ID;
		el.className = "custom-price-peek-popover";
		el.style.display = "none";
		el.setAttribute("role", "dialog");
		el.setAttribute("aria-label", __("Item prices"));
		document.body.appendChild(el);

		el.addEventListener("mouseenter", cancelHide);
		el.addEventListener("mouseleave", () => scheduleHide());
		return el;
	}

	function cancelHide() {
		if (hideTimer) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
	}

	function scheduleHide(delay = 180) {
		cancelHide();
		hideTimer = setTimeout(() => hide(), delay);
	}

	function hide() {
		cancelHide();
		const el = document.getElementById(POPOVER_ID);
		if (el) el.style.display = "none";
		if (activeAnchor) {
			activeAnchor.classList.remove("is-open");
			activeAnchor = null;
		}
	}

	function positionPopover(anchor) {
		const el = getPopover();
		const rect = anchor.getBoundingClientRect();
		const gap = 8;
		const width = el.offsetWidth || 300;
		const height = el.offsetHeight || 180;

		let left = rect.right + gap;
		let top = rect.top;

		if (left + width > window.innerWidth - 8) {
			left = Math.max(8, rect.left - width - gap);
		}
		if (top + height > window.innerHeight - 8) {
			top = Math.max(8, window.innerHeight - height - 8);
		}
		if (top < 8) top = 8;

		el.style.left = `${Math.round(left)}px`;
		el.style.top = `${Math.round(top)}px`;
	}

	function renderLoading(itemCode) {
		const el = getPopover();
		el.innerHTML = `
			<div class="peek-header">
				<div>
					<div class="peek-title">${escapeHtml(itemCode)}</div>
					<div class="peek-subtitle">${__("Loading prices…")}</div>
				</div>
				<button type="button" class="peek-close" aria-label="${__("Close")}">×</button>
			</div>
			<div class="peek-loading">${__("Please wait")}</div>
		`;
		el.querySelector(".peek-close")?.addEventListener("click", hide);
	}

	function renderError(message) {
		const el = getPopover();
		el.innerHTML = `
			<div class="peek-header">
				<div>
					<div class="peek-title">${__("Item prices")}</div>
				</div>
				<button type="button" class="peek-close" aria-label="${__("Close")}">×</button>
			</div>
			<div class="peek-error">${escapeHtml(message || __("Could not load prices"))}</div>
		`;
		el.querySelector(".peek-close")?.addEventListener("click", hide);
	}

	function renderBuying(buying) {
		if (!buying || !(flt(buying.rate) > 0)) return "";

		const uom = buying.uom || "";
		const rateLabel = `${formatRate(buying.rate, buying.currency)}${uom ? ` / ${uom}` : ""}`;
		const sourceBits = [];
		if (buying.purchase_order) {
			sourceBits.push(buying.purchase_order);
		}
		if (buying.source_uom && buying.source_rate != null) {
			sourceBits.push(
				`${formatRate(buying.source_rate, buying.currency)} / ${buying.source_uom}`
			);
		}
		if (buying.transaction_date) {
			sourceBits.push(buying.transaction_date);
		}

		return `
			<div class="peek-buying">
				<div class="peek-buying-label">${__("Buying (latest PO)")}</div>
				<div class="peek-buying-row">
					<div class="peek-buying-rate">${escapeHtml(rateLabel)}</div>
					<div class="peek-buying-meta">${escapeHtml(sourceBits.join(" · ") || __("From Purchase Order"))}</div>
				</div>
			</div>
		`;
	}

	function renderPrices(data) {
		const el = getPopover();
		const prices = data?.prices || [];
		const title = data?.item_name || data?.item_code || __("Item prices");
		const subtitle = data?.item_code && data?.item_name !== data?.item_code ? data.item_code : __("All price lists");
		const buyingHtml = renderBuying(data?.buying);

		let bodyHtml = "";
		if (!prices.length && !buyingHtml) {
			bodyHtml = `<div class="peek-empty">${__("No other prices found")}</div>`;
		} else if (!prices.length) {
			bodyHtml = `<div class="peek-empty">${__("No selling price lists found")}</div>`;
		} else {
			const rows = prices
				.map((row) => {
					const badges = [];
					if (row.is_current) {
						badges.push(`<span class="peek-badge is-current">${__("Current")}</span>`);
					} else if (row.is_default) {
						badges.push(`<span class="peek-badge">${__("Default")}</span>`);
					}
					return `
						<tr class="${row.is_current ? "is-current" : ""}">
							<td>
								${escapeHtml(row.price_list)}
								${badges.join("")}
							</td>
							<td>${escapeHtml(row.uom || "—")}</td>
							<td class="peek-rate">${escapeHtml(formatRate(row.price_list_rate, row.currency))}</td>
						</tr>
					`;
				})
				.join("");

			bodyHtml = `
				<table>
					<thead>
						<tr>
							<th>${__("Price List")}</th>
							<th>${__("UOM")}</th>
							<th style="text-align:right">${__("Rate")}</th>
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			`;
		}

		el.innerHTML = `
			<div class="peek-header">
				<div>
					<div class="peek-title">${escapeHtml(title)}</div>
					<div class="peek-subtitle">${escapeHtml(subtitle)}</div>
				</div>
				<button type="button" class="peek-close" aria-label="${__("Close")}">×</button>
			</div>
			${buyingHtml}
			<div class="peek-body">${bodyHtml}</div>
		`;
		el.querySelector(".peek-close")?.addEventListener("click", hide);
	}

	function peekOptionsFrom(btn, options = {}) {
		return {
			priceList: options.priceList || btn?.dataset?.priceList || null,
			uom: options.uom || btn?.dataset?.uom || null,
		};
	}

	function fetchPrices(itemCode, currentPriceList, displayUom) {
		const cached = readCache(itemCode, currentPriceList, displayUom);
		if (cached) return Promise.resolve(cached);

		return frappe
			.call({
				method: "custom.custom_extensions.item_standard_rate_sync.get_item_price_matrix",
				args: {
					item_code: itemCode,
					current_price_list: currentPriceList || null,
					display_uom: displayUom || null,
				},
			})
			.then((r) => {
				const data = r?.message || { item_code: itemCode, prices: [], buying: null };
				writeCache(itemCode, currentPriceList, displayUom, data);
				return data;
			});
	}

	function show(anchor, itemCode, options = {}) {
		injectStyles();
		if (!itemCode || !anchor) return;

		cancelHide();
		if (activeAnchor && activeAnchor !== anchor) {
			activeAnchor.classList.remove("is-open");
		}
		activeAnchor = anchor;
		anchor.classList.add("is-open");

		const opts = peekOptionsFrom(anchor, options);
		const el = getPopover();
		el.style.display = "block";
		renderLoading(itemCode);
		positionPopover(anchor);

		fetchPrices(itemCode, opts.priceList, opts.uom)
			.then((data) => {
				if (activeAnchor !== anchor) return;
				renderPrices(data);
				positionPopover(anchor);
			})
			.catch((err) => {
				if (activeAnchor !== anchor) return;
				renderError(err?.message || __("Could not load prices"));
				positionPopover(anchor);
			});
	}

	function bindButtonEvents(btn, itemCode, options = {}) {
		if (!btn || btn.dataset.peekBound === "1") return;
		btn.dataset.peekBound = "1";

		btn.addEventListener("mouseenter", (e) => {
			e.stopPropagation();
			show(btn, itemCode || btn.dataset.itemCode, peekOptionsFrom(btn, options));
		});
		btn.addEventListener("mouseleave", () => scheduleHide());
		btn.addEventListener("mousedown", (e) => {
			e.preventDefault();
			e.stopPropagation();
		});
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const code = itemCode || btn.dataset.itemCode;
			if (activeAnchor === btn && getPopover().style.display !== "none") {
				hide();
			} else {
				show(btn, code, peekOptionsFrom(btn, options));
			}
		});
	}

	function makeButton(itemCode, options = {}) {
		injectStyles();
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "custom-price-peek-btn";
		btn.title = __("Other prices");
		btn.setAttribute("aria-label", __("Show other prices"));
		btn.dataset.itemCode = itemCode;
		if (options.priceList) btn.dataset.priceList = options.priceList;
		if (options.uom) btn.dataset.uom = options.uom;
		// Plain glyph — reliable across Frappe icon sets / dark POS themes.
		btn.innerHTML = `<span class="peek-icon" aria-hidden="true">i</span>`;
		bindButtonEvents(btn, itemCode, options);
		return btn;
	}

	function attachTo(container, itemCode, options = {}) {
		if (!container || !itemCode) return null;
		injectStyles();

		let btn = container.querySelector?.(".custom-price-peek-btn");
		if (btn) {
			btn.dataset.itemCode = itemCode;
			if (options.priceList) btn.dataset.priceList = options.priceList;
			if (options.uom) btn.dataset.uom = options.uom;
			bindButtonEvents(btn, itemCode, options);
			return btn;
		}

		btn = makeButton(itemCode, options);
		if (container.appendChild) {
			container.appendChild(btn);
		}
		return btn;
	}

	function findItemCards($container) {
		const $cards = $container.find(
			".item-wrapper, .pos-item-wrapper, [data-item-code].item-card, .items-container [data-item-code]"
		);
		if ($cards.length) return $cards;

		// Fallback: any descendant with an item code attribute.
		return $container.find("[data-item-code]");
	}

	function enhancePosItems($container, getPriceList) {
		if (!$container?.length) return;
		injectStyles();

		findItemCards($container).each(function () {
			const wrapper = this;
			const itemCode = wrapper.getAttribute("data-item-code");
			if (!itemCode) return;

			const priceList =
				(typeof getPriceList === "function" ? getPriceList() : null) ||
				wrapper.getAttribute("data-price-list") ||
				"";
			const uom =
				wrapper.getAttribute("data-uom") ||
				wrapper.getAttribute("data-stock-uom") ||
				"";

			const existing = wrapper.querySelector(".custom-price-peek-btn");
			if (existing) {
				existing.dataset.itemCode = itemCode;
				if (priceList) existing.dataset.priceList = priceList;
				if (uom) existing.dataset.uom = uom;
				bindButtonEvents(existing, itemCode, { priceList, uom });
				return;
			}

			let host =
				wrapper.querySelector(".custom-pos-price-cell") ||
				wrapper.querySelector(".item-rate") ||
				wrapper.querySelector(".price-list-rate") ||
				wrapper.querySelector(".item-price") ||
				wrapper.querySelector(".item-display .item-rate") ||
				wrapper.querySelector(".item-name") ||
				null;

			if (!host) {
				host = document.createElement("span");
				host.className = "custom-price-peek-inline";
				wrapper.appendChild(host);
			} else {
				const display = getComputedStyle(host).display;
				if (display === "block" || display === "flex") {
					host.style.display = "inline-flex";
					host.style.alignItems = "center";
					host.style.flexWrap = "wrap";
					host.style.gap = "4px";
				}
			}

			attachTo(host, itemCode, { priceList, uom });
		});
	}

	function watchPosContainer($container, getPriceList) {
		if (!$container?.length || $container.data("customPeekObserver")) return;

		const run = () => enhancePosItems($container, getPriceList);
		run();

		const root = $container.get(0);
		if (!root || typeof MutationObserver === "undefined") return;

		const observer = new MutationObserver(() => {
			window.requestAnimationFrame(run);
		});
		observer.observe(root, { childList: true, subtree: true });
		$container.data("customPeekObserver", observer);
	}

	document.addEventListener("click", (e) => {
		const pop = document.getElementById(POPOVER_ID);
		if (!pop || pop.style.display === "none") return;
		if (pop.contains(e.target)) return;
		if (e.target.closest?.(".custom-price-peek-btn")) return;
		hide();
	});

	window.addEventListener("scroll", () => hide(), true);
	window.addEventListener("resize", () => hide());

	window.custom_item_price_peek = {
		show,
		hide,
		attachTo,
		makeButton,
		enhancePosItems,
		watchPosContainer,
		injectStyles,
	};
})();
