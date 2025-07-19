const cds = require('@sap/cds');

class PersonalitiesRepository {
  async getPersonality(personalityId) {
    const { Personalities } = cds.entities('ChatService');
    return await SELECT.one.from(Personalities, personalityId);
  }
}

module.exports = PersonalitiesRepository;