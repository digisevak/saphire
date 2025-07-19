sap.ui.define([
	"saphire/controller/BaseController",
	"saphire/util/Helper",
	"saphire/service/ChatService",
	"saphire/service/NewMessageHandler",
	"saphire/util/UIHelper"
], function (BaseController, Helper, ChatService, NewMessageHandler, UIHelper) {
	"use strict";

	/**
	 * @namespace saphire.controller
	 */
	return BaseController.extend("saphire.controller.Chat", {
		
		onInit: function () {
			this.getRouter().getRoute("chat").attachPatternMatched(this.onRouteMatched, this);
		},

		onAfterRendering: function () {
			var that = this;
			this.addKeyboardEventsToInput();
			this.getView().byId("messageList").addEventDelegate({
				onAfterRendering: function () {
					UIHelper.scrollToElement(that.getView().byId("listEndMarker").getDomRef(), 100);
				}
			});
		},

		onRouteMatched: function (event) {
			var chat = event.getParameter("arguments").chat;
			this.getView().bindElement({
				path: "/Chats(" + chat + ")"
			});
		},

		onStreamingEnabledChange: function (event) {
			ChatService.getInstance().submitChanges();
			var toast = this.getView().byId("steamingEnabledToast");
			toast.setText("Streaming " + (event.getParameter("state") ? "enabled" : "disabled") + " for chat.");
			toast.show();
		},

		onDeleteChat: function (event) {
			var that = this;
			Helper.withConfirmation("Delete Chat", "Are you sure you want to delete this chat?", function () {
				return ChatService.getInstance().deleteEntity(that.getView().getBindingContext()).then(function () {
					that.getRouter().navTo("home");
				});
			});
		},

		onPostMessage: function (event) {
			var that = this;
			var message = event.getParameter("value");
			var chat = this.getView().getBindingContext().getObject();
			var binding = this.getView().byId("messageList").getBinding("items");

			var messageHandler = new NewMessageHandler({
				chat: chat,
				binding: binding,
				message: message,
				// sender: this.getModel("user").getUser().displayName,
				sender: "Shivam",
				streamingCallback: function (chunk, replyContext) {
					if (!chunk) return;
					replyContext.setProperty("text", replyContext.getProperty("text") + chunk);
					UIHelper.scrollToElement(that.getView().byId("listEndMarker").getDomRef());
				}
			});
			return messageHandler.createMessageAndCompletion();
		},

		addKeyboardEventsToInput: function () {
			var input = this.getView().byId("newMessageInput");
			input.attachBrowserEvent("keydown", function (event) {
				if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && input.getValue().trim() !== "") {
					input.fireEvent("post", { value: input.getValue() });
					input.setValue(null);
					event.preventDefault();
				}
			});
		}
	});
});