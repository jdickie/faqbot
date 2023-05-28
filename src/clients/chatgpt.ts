import {
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  CreateChatCompletionResponse,
  CreateChatCompletionResponseChoicesInner,
  CreateCompletionRequest,
  CreateCompletionResponse,
  OpenAIApi,
} from "openai";
import CHATGPT from "../constants/chatgpt";

export class ChatGPTClient {
  chatClient: OpenAIApi;
  numCompletions: number = 2;

  constructor(options: any) {
    const config: Configuration = new Configuration({
      apiKey: CHATGPT.AUTH_TOKEN,
      ...options,
    });
    this.chatClient = new OpenAIApi(config);
  }

  async chat(
    text: string,
    role: ChatCompletionRequestMessageRoleEnum
  ): Promise<string> {
    try {
      const completion: CreateChatCompletionResponse | any =
        await this.chatClient.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [{ role: role, content: text }],
          temperature: CHATGPT.CHAT_MODEL_TEMPERATURE,
          n: this.numCompletions,
        });
      if (!completion.data) {
        console.log("No data returned from GPT");
        return "No answer";
      }
      const answers: string[] = completion.data.choices.map(
        (choice: CreateChatCompletionResponseChoicesInner) => {
          return choice.message?.content;
        }
      );
      return answers.join("\n");
    } catch (err: any) {
      console.log({
        message: err.message,
        stack: err.stack,
      });
      return "No answer";
    }
  }

  async completePrompt(args: CreateCompletionRequest): Promise<string> {
    try {
      const completion: any = await this.chatClient.createCompletion(args);

      const answers: string[] = completion.data.choices.map((choice: any) => {
        return choice.text;
      });
      return answers.join("\n");
    } catch (err: any) {
      console.log({
        message: err.message,
        stack: err.stack,
      });
      return "No answer";
    }
  }
}
