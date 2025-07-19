sap.ui.define([], function () {
	"use strict";

	/**
	 * @namespace saphire.util
	 */
	var UIHelper = {
		/**
		 * Scrolls to a specific element with optional timeout and behavior
		 * @param {Element} element - The DOM element to scroll to
		 * @param {number} timeout - Optional delay before scrolling (default: 0)
		 * @param {string} behavior - Scroll behavior: "smooth" or "auto" (default: "smooth")
		 */
		scrollToElement: function (element, timeout, behavior) {
			timeout = timeout || 0;
			behavior = behavior || "smooth";
			
			setTimeout(function () {
				element.scrollIntoView({ behavior: behavior });
			}, timeout);
		}
	};

	return UIHelper;
});