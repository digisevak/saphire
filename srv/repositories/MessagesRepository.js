const cds = require('@sap/cds');

class MessagesRepository {
  async getMessages(chatId) {
    const { Messages } = cds.entities('ChatService');
    return await SELECT.from(Messages)
      .where({ chat_ID: chatId })
      .orderBy('createdAt');
  }
}

module.exports = MessagesRepository;