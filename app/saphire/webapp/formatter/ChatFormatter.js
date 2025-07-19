sap.ui.define([], function () {
	"use strict";

	/**
	 * @namespace saphire.formatter
	 */
	var ChatFormatter = {
		/**
		 * Returns the appropriate icon for the sender
		 * @param {string} sender - The sender type
		 * @returns {string} The icon path
		 */
		senderIcon: function (sender) {
			// Assuming AI sender value is "AI" - adjust as needed based on your enum
			return sender === "AI" ? "sap-icon://tnt/robot" : "sap-icon://tnt/user";
		},

		/**
		 * Determines if an item should be visible in the list
		 * @param {string} id - The item ID
		 * @returns {boolean} True if item should be visible
		 */
		itemIsVisibleInList: function (id) {
			return !!id;
		}
	};

	return ChatFormatter;
});