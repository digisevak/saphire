sap.ui.define([
	"saphire/service/ChatService"
], function (ChatService) {
	"use strict";

	/**
	 * @namespace saphire.service
	 */

	/**
	 * This class is responsible for creating a new message with a corresponding completion reply.
	 * @param {object} settings - Configuration object
	 * @param {object} settings.chat - The chat object
	 * @param {string} settings.message - The message text
	 * @param {object} settings.binding - The OData list binding
	 * @param {string} settings.sender - The sender name
	 * @param {function} [settings.streamingCallback] - Optional callback for streaming chunks
	 */
	var NewMessageHandler = function(settings) {
		this.chat = settings.chat;
		this.message = settings.message;
		this.binding = settings.binding;
		this.sender = settings.sender;
		this.streamingCallback = settings.streamingCallback;
	};

	/**
	 * Creates a new message and a completion reply. Depending on the chat settings, the completion
	 * reply is either retrieved in one request or in multiple streaming requests, which can be captured by the streamingCallback.
	 *
	 * @returns {Promise<void>}
	 */
	NewMessageHandler.prototype.createMessageAndCompletion = function() {
		var that = this;
		var chatService = ChatService.getInstance();

		return chatService.createEntity({
			binding: this.binding,
			entity: {
				text: this.message.trim(),
				model: this.chat.model,
				sender: this.sender,
				chat_ID: this.chat.ID
			},
			atEnd: true,
			submitBatch: true
		}).then(function() {
			if (that.chat.streamingEnabled) {
				return that.handleStreamingCompletion();
			} else {
				return that.handleCompletion();
			}
		});
	};

	/**
	 * Handles non-streaming completion request
	 * @returns {Promise<void>}
	 */
	NewMessageHandler.prototype.handleCompletion = function() {
		var that = this;
		var chatService = ChatService.getInstance();
		
		return chatService.getCompletion({
			chat: this.chat.ID,
			model: this.chat.model,
			personality: this.chat.personality_ID
		}).then(function(completion) {
			return chatService.createEntity({
				binding: that.binding,
				entity: {
					text: completion.message,
					model: that.chat.model,
					sender: "SAPHIRE AI", // Using string literal instead of enum
					chat_ID: that.chat.ID
				},
				atEnd: true,
				submitBatch: true
			});
		});
	};

	/**
	 * Handles streaming completion request
	 * @returns {Promise<void>}
	 */
	NewMessageHandler.prototype.handleStreamingCompletion = function() {
		var that = this;
		var chatService = ChatService.getInstance();
		
		return chatService.createEntity({
			binding: this.binding,
			entity: {
				text: "",
				model: this.chat.model,
				sender: "AI", // Using string literal instead of enum
				chat_ID: this.chat.ID
			},
			atEnd: true,
			submitBatch: false
		}).then(function(responseContext) {
			return chatService.getCompletionAsStream(
				{
					chat: that.chat.ID,
					model: that.chat.model,
					personality: that.chat.personality_ID
				},
				function(chunk) {
					if (that.streamingCallback) {
						that.streamingCallback(chunk, responseContext);
					}
				}
			).then(function() {
				// Finally submit
				var model = that.binding.getModel();
				model.submitBatch(model.getUpdateGroupId());
			});
		});
	};

	return NewMessageHandler;
});