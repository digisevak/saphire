sap.ui.define([
	"sap/ui/core/Fragment"
], function (Fragment) {
	"use strict";

	/**
	 * @namespace saphire.service
	 */
	var NewEntityDialog = function(context, fragment, view) {
		this.context = context;
		this.fragment = fragment;
		this.view = view;
		this.resolve = null;
		this.reject = null;
		this.dialog = null;
		this.model = null;
	};

	/**
	 * Opens the entity creation dialog
	 * @returns {Promise<object>} Promise resolving to the created context
	 */
	NewEntityDialog.prototype.open = function() {
		var that = this;
		this.model = this.context.getModel();

		return new Promise(function(resolve, reject) {
			that.resolve = resolve;
			that.reject = reject;
			
			Fragment.load({
				id: "newEntityDialog",
				name: "saphire.fragment." + that.fragment,
				controller: that
			}).then(function(dialog) {
				that.dialog = dialog;
				that.view.addDependent(that.dialog);
				that.dialog.setBindingContext(that.context);
				
				that.context.created().then(function() {
					that.dialog.close();
					that.resolve(that.context);
				}, reject);

				that.dialog.open();
			});
		});
	};

	/**
	 * Handles the create action by submitting the batch
	 * @returns {Promise<void>}
	 */
	NewEntityDialog.prototype.onCreate = function() {
		return Promise.resolve(this.model.submitBatch(this.model.getUpdateGroupId()));
	};

	/**
	 * Handles the cancel action
	 */
	NewEntityDialog.prototype.onCancel = function() {
		this.dialog.close();
		this.reject({ error: "User cancelled" });
	};

	return NewEntityDialog;
});