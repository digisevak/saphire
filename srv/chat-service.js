const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
  
  // Import services
  const OpenAIService = require('./services/OpenAIService');
  const ChatBuilder = require('./services/ChatBuilder');
  
  const openAIService = new OpenAIService();
  const chatBuilder = new ChatBuilder();

  this.on('getModels', async (req) => {
    try {
      const models = await openAIService.readModels();
      return models;
    } catch (error) {
      req.error(500, error.message);
    }
  });

  this.on('getCompletion', async (req) => {
    const { model, personality: personalityId, chat: chatId } = req.data;
    
    try {
      let response;

      if (model.startsWith("gpt-3.5") || model.startsWith("gpt-4")) {
        const messages = await chatBuilder.getChatAsMessages(chatId, personalityId);
        response = await openAIService.createChatCompletion(messages, model);
      } else {
        const prompt = await chatBuilder.getChatAsPrompt(chatId, personalityId);
        response = await openAIService.createCompletion(prompt, model);
      }

      return { message: response };
    } catch (error) {
      req.error(500, error.message);
    }
  });

  this.on('getCompletionAsStream', async (req) => {
    const { model, personality: personalityId, chat: chatId } = req.data;
    
    try {
      let stream;

      // Access the HTTP response object for streaming
      const httpRes = req._.res;

      httpRes.setHeader("Content-Type", "text/event-stream");
      httpRes.setHeader("Cache-Control", "no-cache");
      httpRes.setHeader("Connection", "keep-alive");

      if (model.startsWith("gpt-3.5") || model.startsWith("gpt-4")) {
        const messages = await chatBuilder.getChatAsMessages(chatId, personalityId);
        stream = await openAIService.createChatCompletionAsStream(messages, model);
      } else {
        const prompt = await chatBuilder.getChatAsPrompt(chatId, personalityId);
        stream = await openAIService.createCompletionAsStream(prompt, model);
      }

      return new Promise((resolve) => {
        stream.on("chunk", (chunk) => {
          httpRes.write(JSON.stringify({ message: chunk }));
          if (httpRes.flush) httpRes.flush();
        });

        stream.on("end", () => {
          httpRes.end();
          resolve();
        });

        stream.on("error", (error) => {
          console.error('Stream error:', error);
          httpRes.end();
          resolve();
        });
      });
    } catch (error) {
      req.error(500, error.message);
    }
  });

});