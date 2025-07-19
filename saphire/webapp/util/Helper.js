sap.ui.define([
	"sap/m/MessageBox",
	"sap/ui/Device"
], function (MessageBox, Device) {
	"use strict";

	/**
	 * @namespace saphire.util
	 */
	var Helper = {
		contentDensityClass: undefined,

		/**
		 * Helper for confirmation dialogs.
		 *
		 * @param {string} title
		 * @param {string} text
		 * @param {function} callback
		 */
		withConfirmation: function (title, text, callback) {
			MessageBox.confirm(text, {
				title: title,
				onClose: function (action) {
					if (action === MessageBox.Action.OK) {
						callback();
					}
				}
			});
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 *
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function () {
			if (this.contentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
					this.contentDensityClass = "";
				} else if (!Device.support.touch) {
					// apply "compact" mode if touch is not supported
					this.contentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this.contentDensityClass = "sapUiSizeCozy";
				}
			}
			return this.contentDensityClass;
		}
	};

	return Helper;
});