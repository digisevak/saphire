sap.ui.define([
	"saphire/controller/BaseController",
	"saphire/util/Helper"
], function (BaseController, Helper) {
	"use strict";

	/**
	 * @namespace saphire.controller
	 */
	return BaseController.extend("saphire.controller.App", {
		onInit: function () {
			// apply content density mode to root view
			this.getView().addStyleClass(Helper.getContentDensityClass());
		}
	});
});