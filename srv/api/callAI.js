const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: "gen-swKCZOjw5WKNIMhlMxHLSe3PWm1pEFcrtRFXxMOtZYR5kDic",
  baseURL: "https://llm-server.llmhub.t-systems.net/v2"
});


class CallAI {
  async llm(userPrompt, systemPrompt) {
    try {
      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.01,
        stream: false
      });

      return chatCompletion.choices[0].message.content;
    } catch (error) {
      console.error('Error in LLM call:', error);
      throw error;
    }
  }

  async embedding(text) {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
        encoding_format: "float",
      });
      const embeddings = response.data.map(item => item.embedding);
      return embeddings;
    } catch (error) {
      console.error('Error From OPEN AI Embedding Model:', error);
      throw error;
    }
  }

}

module.exports = CallAI