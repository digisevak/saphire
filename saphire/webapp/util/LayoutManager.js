sap.ui.define([
	"sap/f/library",
	"sap/ui/model/json/JSONModel"
], function (fioriLibrary, JSONModel) {
	"use strict";

	/**
	 * @namespace saphire.util
	 */
	var LayoutManager = function() {
		this.model = null;
	};

	LayoutManager._instance = null;

	LayoutManager.getInstance = function() {
		if (!LayoutManager._instance) {
			LayoutManager._instance = new LayoutManager();
		}
		return LayoutManager._instance;
	};

	LayoutManager.prototype.setModel = function(model) {
		this.model = model;
	};

	LayoutManager.prototype.setLayout = function(layout) {
		this.model.setData({
			currentLayout: layout,
			oldLayout: this.getLayout(),
			isFullScreen: layout === fioriLibrary.LayoutType.MidColumnFullScreen || 
						  layout === fioriLibrary.LayoutType.EndColumnFullScreen
		});
	};

	LayoutManager.prototype.getLayout = function() {
		return this.model.getProperty("/currentLayout");
	};

	LayoutManager.prototype.setMidColumnFullScreen = function() {
		this.setLayout(fioriLibrary.LayoutType.MidColumnFullScreen);
	};

	LayoutManager.prototype.setEndColumnFullScreen = function() {
		this.setLayout(fioriLibrary.LayoutType.EndColumnFullScreen);
	};

	LayoutManager.prototype.exitFullScreen = function() {
		this.setLayout(this.model.getProperty("/oldLayout"));
	};

	return LayoutManager;
});