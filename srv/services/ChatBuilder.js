const MessagesRepository = require('../repositories/MessagesRepository');
const PersonalitiesRepository = require('../repositories/PersonalitiesRepository');

class ChatBuilder {
  constructor() {
    this.messagesRepository = new MessagesRepository();
    this.personalityRepository = new PersonalitiesRepository();
  }

  async getChatAsPrompt(chatId, personalityId) {
    const instructions = await this.readInstructions(personalityId);
    const messages = await this.messagesRepository.getMessages(chatId);
    
    const chat = messages
      .map((message) => {
        const sender = message.sender === "AI" ? "AI" : "HUMAN";
        const plainMessage = message.text.trim().replace(/\n/g, " ");
        return `${sender}: ${plainMessage}`;
      })
      .join("\n");

    return `${instructions}${chat}\nAI:`;
  }

  async getChatAsMessages(chatId, personalityId) {
    const instructions = await this.readInstructions(personalityId);
    const messages = await this.messagesRepository.getMessages(chatId);
    
    const chatMessages = messages.map((message) => {
      return {
        role: message.sender === "AI" ? "assistant" : "user",
        content: message.text.trim().replace(/\n/g, " "),
      };
    });

    return [
      { role: "system", content: instructions }, 
      ...chatMessages
    ];
  }

  async readInstructions(personalityId) {
    if (!personalityId) return "";
    
    const personality = await this.personalityRepository.getPersonality(personalityId);
    return personality?.instructions || "";
  }
}

module.exports = ChatBuilder;