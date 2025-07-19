sap.ui.define([
	"sap/m/BusyDialog",
	"sap/m/MessageBox"
], function (BusyDialog, MessageBox) {
	"use strict";

	/**
	 * @namespace saphire.service
	 */
	var ChatService = function() {
		this.model = null;
	};

	ChatService._instance = null;

	ChatService.getInstance = function() {
		if (!ChatService._instance) {
			ChatService._instance = new ChatService();
		}
		return ChatService._instance;
	};

	ChatService.prototype.setModel = function(model) {
		this.model = model;
	};

	ChatService.prototype.submitChanges = function() {
		if (!this.model) {
			return Promise.reject(new Error("Model is not set. Call setModel() first."));
		}
		return Promise.resolve(this.model.submitBatch(this.model.getUpdateGroupId()));
	};

	/**
	 * Creates a new entity in the OData service
	 * @param {object} params - Parameters object containing entity, binding, and options
	 * @param {object} params.entity - The entity data to create
	 * @param {object} params.binding - The OData list binding
	 * @param {boolean} [params.skipRefresh=false] - Whether to skip refresh
	 * @param {boolean} [params.atEnd=true] - Whether to add at end
	 * @param {boolean} [params.submitBatch=true] - Whether to submit batch
	 * @returns {Promise<object>} Promise resolving to the created context
	 */
	ChatService.prototype.createEntity = function(params) {
		if (!this.model && params.binding && params.binding.getModel) {
			this.model = params.binding.getModel();
		}
		
		if (!this.model) {
			return Promise.reject(new Error("Model is not set. Call setModel() first or ensure binding has a model."));
		}

		var entity = params.entity;
		var binding = params.binding;
		var skipRefresh = params.skipRefresh !== undefined ? params.skipRefresh : false;
		var atEnd = params.atEnd !== undefined ? params.atEnd : true;
		var submitBatch = params.submitBatch !== undefined ? params.submitBatch : true;
		var that = this;

		return new Promise(function(resolve, reject) {
			try {
				var context = binding.create(entity, skipRefresh, atEnd);
				if (submitBatch) {
					context.created().then(function() {
						resolve(context);
					}).catch(reject);
					that.model.submitBatch(that.model.getUpdateGroupId());
				} else {
					resolve(context);
				}
			} catch (error) {
				reject(error);
			}
		});
	};

	/**
	 * Deletes a single entity in the OData service by using the ODataContextBinding.
	 *
	 * @param {object} context - The OData context to delete
	 * @returns {Promise<void>}
	 */
	ChatService.prototype.deleteEntity = function(context) {
		// Auto-initialize model if not set
		if (!this.model) {
			if (context && context.getModel) {
				this.model = context.getModel();
			} else {
				return Promise.reject(new Error("Model is not set. Call setModel() first or ensure context has a model."));
			}
		}

		var that = this;
		return new Promise(function(resolve, reject) {
			try {
				context.delete().then(resolve, reject);
				that.model.submitBatch(that.model.getUpdateGroupId());
			} catch (error) {
				reject(error);
			}
		});
	};

	/**
	 * Retrieve the completion from the OData service by calling the getCompletion function.
	 *
	 * @param {object} params - Parameters object
	 * @param {string} params.model - The model to use
	 * @param {string} params.chat - The chat ID
	 * @param {string} params.personality - The personality setting
	 * @returns {Promise<object>} Promise resolving to the completion result
	 */
	ChatService.prototype.getCompletion = function(params) {
		if (!this.model) {
			return Promise.reject(new Error("Model is not set. Call setModel() first."));
		}

		var that = this;
		return new Promise(function(resolve, reject) {
			try {
				var binding = that.model.bindContext("/getCompletion(...)");
				binding.setParameter("model", params.model);
				binding.setParameter("chat", params.chat);
				binding.setParameter("personality", params.personality);
				var dialog = new BusyDialog({ text: "Thinking..." });
				dialog.open();
				binding.execute().then(
					function() {
						dialog.close();
						resolve(binding.getBoundContext().getObject());
					},
					function(error) {
						dialog.close();
						MessageBox.alert(error.message, {
							title: "Error"
						});
						reject(error);
					}
				);
			} catch (error) {
				reject(error);
			}
		});
	};

	/**
	 * Get completion as a stream with callback for chunks
	 *
	 * @param {object} params - Parameters object
	 * @param {string} params.model - The model to use
	 * @param {string} params.chat - The chat ID
	 * @param {string} params.personality - The personality setting
	 * @param {function} [callback] - Callback function for processing chunks
	 * @returns {Promise<object>} Promise resolving when stream is complete
	 */
	ChatService.prototype.getCompletionAsStream = function(params, callback) {
		if (!this.model) {
			return Promise.reject(new Error("Model is not set. Call setModel() first."));
		}

		var that = this;
		return new Promise(function(resolve, reject) {
			try {
				var url = that.model.getServiceUrl() + 
					"getCompletionAsStream(model='" + params.model + 
					"',chat='" + params.chat + 
					"',personality='" + params.personality + "')";

				fetch(url).then(function(response) {
					if (!response.ok) {
						throw new Error('Network response was not ok');
					}
					
					var reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
					
					function readStream() {
						return reader.read().then(function(result) {
							var value = result.value;
							var done = result.done;
							
							if (done) {
								resolve(null);
								return;
							}
							
							var regex = /{"message":"[^{}]+?"}/g;
							var objects = value.match(regex);
							if (objects) {
								objects.forEach(function(object) {
									try {
										var data = JSON.parse(object);
										if (data.message && callback) {
											callback.call(that, data.message);
										}
									} catch (error) {
										console.error(error);
									}
								});
							}
							
							return readStream();
						});
					}
					
					return readStream();
				}).catch(reject);
			} catch (error) {
				reject(error);
			}
		});
	};

	return ChatService;
});