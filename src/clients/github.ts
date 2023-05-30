import { Octokit } from '@octokit/rest';
import { writeFileSync, readFileSync, readdirSync, statSync, Stats } from 'fs';
import path from 'path';
import { boolean } from 'yargs';

const octokit: Octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
  userAgent: `FAQBot ${process.env.npm_package_version}`,
});

const recursiveReadForTraining = (
  basepath: string,
  data: string[],
  repoArgs: any
): string[] => {
  let trainingData: string[] = data;
  const files: string[] = readdirSync(basepath);
  files.forEach((file) => {
    const stats: Stats = statSync(path.join(basepath, file));
    if (stats.isDirectory() && /\.git/.test(file) == false) {
      trainingData = recursiveReadForTraining(
        `${basepath}/${file}`,
        trainingData,
        repoArgs
      );
    } else if (stats.isFile()) {
      const contents: string = readFileSync(`${basepath}/${file}`).toString();
      const trainingLine: string = JSON.stringify({
        prompt: `What are the contents of ${file} in ${repoArgs.r}?${repoArgs.s}`,
        completion: `${contents}`,
      });
      trainingData.push(trainingLine);
    }
  });
  return trainingData;
};

const recursiveRead = (basepath: string, list: string): string => {
  const files: string[] = readdirSync(basepath);
  let allFiles: string = '';
  files.forEach((file) => {
    const stats: Stats = statSync(path.join(basepath, file));
    if (stats.isDirectory()) {
      allFiles = recursiveRead(`${basepath}/${file}`, allFiles);
    } else if (stats.isFile()) {
      if (file == 'package.json') {
        const contents: string = readFileSync(`${basepath}/${file}`).toString();
        allFiles += `${file} contents:\n${contents}\n`;
      } else {
        allFiles += `${file}`;
      }
    }
  });
  return list.length ? `${list},${allFiles}` : allFiles;
};

export class GithubClient {
  async getRepoDataFromFiles(args: any): Promise<string> {
    let prompt: string =
      'The following is a repository that needs a better README\n';
    const basePath: string = args.path;

    try {
      // Fetch files in the root
      const allFiles: string = recursiveRead(basePath, '');
      prompt += `\n${allFiles}`;
    } catch (err) {
      console.log(`Error getting files: ${err}`);
    }
    return prompt;
  }

  async getGithubRepoData(args: any): Promise<string> {
    let prompt: string = `Here is data retrieved from Github (Owner: ${args.o}, Repo: ${args.r}):\n`;
    try {
      const existingREADME = await octokit.rest.repos.getReadme({
        owner: args.o,
        repo: args.r,
        ref: args.b ? args.b : 'main',
      });

      prompt += `Here is the current README: ${existingREADME.data.content}\n`;
    } catch (err: any) {
      if (err.status === 404) {
        prompt += `There is no README for this repo.\n`;
      }
    }

    try {
      prompt +=
        'The following are the last few commit messages from the repo in the pattern Author: <Name> | Message: <Commmit Message>:\n';
      const commitStats = await octokit.rest.repos.listCommits({
        owner: args.o,
        repo: args.r,
        per_page: 5,
      });
      commitStats.data.forEach((stat) => {
        prompt += `Author: ${stat.commit.author?.name} | Message: ${stat.commit.message}\n`;
      });
    } catch (err: any) {
      console.log(err);
    }
    return `${prompt}`;
  }

  async getRepoDataTraining(args: any) {
    let trainingData: any[] = [];
    try {
      console.log('checking readme...');
      const existingREADME = await octokit.rest.repos.getReadme({
        owner: args.o,
        repo: args.r,
        ref: args.b ? args.b : 'main',
      });
      const readmeObj: any[] = [
        {
          prompt: `Where is the ${args.r} README?${args.s}`,
          completion: `${existingREADME.data.path}`,
        },
        {
          prompt: `Contents of the ${args.r} README?${args.s}`,
          completion: `${existingREADME.data.content}`,
        },
      ];
      trainingData = trainingData.concat(JSON.stringify(readmeObj));
    } catch (err: any) {
      trainingData = trainingData.concat([
        JSON.stringify({
          prompt: `Where is the ${args.r} README?${args.s}`,
          completion: 'There is no README',
        }),
        JSON.stringify({
          prompt: `Contents of the ${args.r} README?${args.s}`,
          completion: 'No README',
        }),
      ]);
    }

    try {
      const commitStats = await octokit.rest.repos.listCommits({
        owner: args.o,
        repo: args.r,
        per_page: 5,
      });
      commitStats.data.forEach((stat, index) => {
        trainingData.push(
          JSON.stringify({
            prompt: `What is the ${index}-th commit to ${args.r}?${args.s}`,
            completion: `Author: ${stat.commit.author?.name} | Message: ${stat.commit.message}`,
          })
        );
      });
    } catch (err: any) {
      console.log(err);
    }

    // Follow path, traverse tree and read in contents
    const fileTrainingData: string[] = recursiveReadForTraining(
      args.p,
      [],
      args
    );
    trainingData = trainingData.concat(fileTrainingData);
    return trainingData.join('\n');
  }
}
