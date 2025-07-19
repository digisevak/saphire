sap.ui.define([
	"saphire/controller/BaseController",
	"saphire/service/NewEntityDialog"
], function (BaseController, NewEntityDialog) {
	"use strict";

	/**
	 * @namespace saphire.controller
	 */
	return BaseController.extend("saphire.controller.Chats", {
		/**
		 * Called when the controller is instantiated.
		 */
		onInit: function () {
			this.getRouter().getRoute("home").attachPatternMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function (event) {
			this.getView().byId("chatList").getBinding("items").refresh();
		},

		onChatPress: function (event) {
			var item = event.getParameter("listItem");
			this.getRouter().navTo("chat", {
				chat: item.getBindingContext().getProperty("ID")
			});
		},

		onAddChat: function (event) {
			var that = this;
			var binding = this.getView().byId("chatList").getBinding("items");
			var context = binding.create({
				model: "gpt-3.5-turbo"
			});

			var dialog = new NewEntityDialog(context, "NewChatDialog", this.getView());
			return dialog
				.open()
				.then(function (context) {
					that.getRouter().navTo("chat", {
						chat: context.getObject().ID
					});
				})
				.catch(function () {
					context.delete("$auto");
				});
		}
	});
});