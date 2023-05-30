import yargs from 'yargs';
import { ChatGPTClient } from './clients/chatgpt';
import { GithubClient } from './clients/github';
import CHATGPT from './constants/chatgpt';
import { writeFileSync } from 'fs';

const chatClient = new ChatGPTClient({});

yargs(process.argv.slice(2))
  .command(
    'chat',
    'Chat with the model',
    (yargs: any) => {
      return yargs
        .options('r', { alias: 'role', default: 'user' })
        .options('p', { alias: 'prompt' })
        .help()
        .alias('h', 'help');
    },
    async (argv: any) => {
      const answer: string = await chatClient.chat(argv.p, argv.r);
      console.log(answer);
    }
  )
  .command(
    'complete',
    'Given a prompt get a completion',
    (yargs: any) => {
      return yargs
        .options('p', { alias: 'prompt', require: true })
        .options('m', { alias: 'model', type: 'string' })
        .help()
        .alias('h', 'help');
    },
    async (argv: any) => {
      const answer: string = await chatClient.completePrompt(argv);
      console.log(answer);
    }
  )
  .command(
    'createFAQ',
    'Uses a pre-baked prompt to generate an FAQ',
    (yargs: any) => {
      return yargs
        .options('r', { alias: 'repo' })
        .options('o', { alias: 'owner' })
        .options('b', { alias: 'branch' })
        .options('m', { alias: 'model' })
        .options('f', { alias: 'readme-file' })
        .help()
        .alias('h', 'help');
    },
    async (argv: any) => {
      let prompt =
        'Please create a brief FAQ based on the following data. Use Markdown format with each major section organized by headers.';
      // Add github repo content to the prompt
      const github: GithubClient = new GithubClient();
      const repoData: string = await github.getGithubRepoData(argv);
      prompt = `${repoData}\n`;
      const answer = await chatClient.completePrompt({
        prompt: prompt,
        model: argv.m ? argv.m : CHATGPT.CHAT_MODEL,
        temperature: argv.t ? argv.t : CHATGPT.CHAT_MODEL_TEMPERATURE,
        max_tokens: 1000,
        n: 3,
      });
      writeFileSync(argv.f ? argv.f : 'readme.md', answer);
    }
  )
  .command(
    'createREADME',
    'Uses a pre-baked prompt to generate a README',
    (yargs: any) => {
      return yargs
        .options('r', { alias: 'repo' })
        .options('o', { alias: 'owner' })
        .options('p', { alias: 'path' })
        .options('m', { alias: 'model' })
        .options('f', { alias: 'readme-file' })
        .help()
        .alias('h', 'help');
    },
    async (argv: any) => {
      let prompt =
        'Please create a brief FAQ based on the following data. Use Markdown format with each major section organized by headers.';
      // Add github repo content to the prompt
      const github: GithubClient = new GithubClient();
      const githubData: string = await github.getGithubRepoData(argv);
      const repoData: string = await github.getRepoDataFromFiles(argv);
      prompt += `${githubData}\n${repoData}\n`;

      const answer = await chatClient.completePrompt({
        prompt: prompt,
        model: argv.m ? argv.m : CHATGPT.CHAT_MODEL,
        temperature: argv.t ? argv.t : CHATGPT.CHAT_MODEL_TEMPERATURE,
        max_tokens: 1000,
        n: 1,
      });
      writeFileSync(argv.f ? argv.f : 'readme.md', answer);
    }
  )
  .command(
    'train',
    'Creates a training set for a model',
    (yargs: any) => {
      return yargs
        .options('r', { alias: 'repo', require: true })
        .options('o', { alias: 'owner', require: true })
        .options('p', { alias: 'path', require: true })
        .options('s', { alias: 'stop-pattern', default: '####' })
        .options('f', { alias: 'output-file', require: true, type: 'string' })
        .help()
        .alias('h', 'help');
    },
    async (argv) => {
      const github: GithubClient = new GithubClient();
      const trainingData: string = await github.getRepoDataTraining(argv);
      console.log(trainingData);
      writeFileSync(argv.f as string, trainingData);
    }
  )
  .help()
  .alias('h', 'help').argv;
