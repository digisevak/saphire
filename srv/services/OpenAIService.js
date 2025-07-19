const OpenAI = require("openai");
const { Readable } = require("stream");
const CompletionStream = require("./CompletionStream");
const cds = require('@sap/cds');

class OpenAIService {
  constructor() {
    this.config = cds.env.for("app").openai || {};
    this.apiInstance = null;
  }

  get api() {
    if (!this.apiInstance) {
      this.apiInstance = new OpenAI({
        apiKey: "gen-swKCZOjw5WKNIMhlMxHLSe3PWm1pEFcrtRFXxMOtZYR5kDic",
        baseURL: "https://llm-server.llmhub.t-systems.net/v2"
      });
    }
    return this.apiInstance;
  }

  /**
   * Returns a list of all models
   * @returns {Promise<Array<{id: string, category: string}>>} the list of models
   */
  async readModels() {
    try {
      const response = await this.api.models.list();
      return response.data
        .map((model) => {
          return {
            id: model.id,
            category: model.id.startsWith("gpt-4")
              ? "GPT-4"
              : model.id.startsWith("gpt-3.5")
              ? "GPT-3.5"
              : "GPT-3 and others",
          };
        })
        .sort((a, b) => b.category.localeCompare(a.category));
    } catch (error) {
      console.error('Error fetching models:', error);
      // Return default models if API call fails
      return [
        { id: "gpt-4o", category: "GPT-4" },
        { id: "gpt-4", category: "GPT-4" },
        { id: "gpt-3.5-turbo", category: "GPT-3.5" }
      ];
    }
  }

  async createChatCompletionAsStream(messages, model = "gpt-4o") {
    const attributes = this.config.completionAttributes || {};
    try {
      const stream = await this.api.chat.completions.create({
        ...this.mergeAttributesWithDefaults(attributes),
        model: model,
        messages: messages,
        stream: true,
      });

      return this.buildStreamFromAsyncIterable(stream);
    } catch (error) {
      console.error('Error creating chat completion stream:', error);
      throw error;
    }
  }

  async createChatCompletion(messages, model = "gpt-4o") {
    const attributes = this.config.completionAttributes || {};
    try {
      const response = await this.api.chat.completions.create({
        ...this.mergeAttributesWithDefaults(attributes),
        model: model,
        messages: messages,
        stream: false,
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error creating chat completion:', error);
      return `The OpenAI API sadly returned an error! (Error: ${error.message})`;
    }
  }

  async createCompletionAsStream(prompt, model = "gpt-4o") {
    // Convert prompt to chat format for newer models
    const messages = [
      { role: "user", content: prompt }
    ];
    return this.createChatCompletionAsStream(messages, model);
  }

  /**
   * Returns a completion for the given prompt and model
   * @param {string} prompt
   * @param {string} model
   * @returns {Promise<string>} the response of the model
   */
  async createCompletion(prompt, model = "gpt-4o") {
    // Convert prompt to chat format for newer models
    const messages = [
      { role: "user", content: prompt }
    ];
    return this.createChatCompletion(messages, model);
  }

  mergeAttributesWithDefaults(attributes) {
    return {
      max_tokens: attributes.max_tokens || 3000,
      temperature: attributes.temperature || 0.01,
      top_p: attributes.top_p || 1,
      frequency_penalty: attributes.frequency_penalty || 0,
      presence_penalty: attributes.presence_penalty || 0.6,
    };
  }

  buildStreamFromAsyncIterable(asyncIterable) {
    const stream = new CompletionStream();
    
    (async () => {
      try {
        for await (const chunk of asyncIterable) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            stream.emit("chunk", content);
          }
        }
        stream.emit("end");
      } catch (error) {
        stream.emit("error", error);
      }
    })();
    
    return stream;
  }

  buildStream(readable, extractorCallback) {
    const stream = new CompletionStream();
    
    readable.on("data", (completionData) => {
      try {
        const data = JSON.parse(completionData.toString().trim().replace("data: ", ""));
        const chunk = extractorCallback(data);
        if (chunk) {
          stream.emit("chunk", chunk);
        }
      } catch (error) {
        stream.emit("error", error);
      }
    });

    readable.on("end", () => {
      stream.emit("end");
    });
    
    return stream;
  }
}

module.exports = OpenAIService;