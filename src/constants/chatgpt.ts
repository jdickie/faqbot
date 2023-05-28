export default class CHATGPT {
  static readonly AUTH_TOKEN: string = process.env.CHATGPT_AUTH_TOKEN
    ? `${process.env.CHATGPT_AUTH_TOKEN}`
    : "";
  static readonly CHAT_MODEL: string = process.env.CHATGPT_CHAT_MODEL
    ? `${process.env.CHATGPT_CHAT_MODEL}`
    : "gpt-3.5-turbo";
  static readonly CHAT_MODEL_TEMPERATURE: number = process.env
    .CHATGPT_CHAT_MODEL_TEMPERATURE
    ? parseFloat(`${process.env.CHATGPT_CHAT_MODEL_TEMPERATURE}`)
    : 0.9;
}
