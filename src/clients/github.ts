import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync, readdirSync, statSync, Stats } from "fs";
import path from "path";

const octokit: Octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
  userAgent: `FAQBot ${process.env.npm_package_version}`,
});

const recursiveRead = (basepath: string, list: string) => {
  const files: string[] = readdirSync(basepath);
  let allFiles: string = "";
  files.forEach((file) => {
    const stats: Stats = statSync(path.join(basepath, file));
    if (stats.isDirectory()) {
      allFiles = recursiveRead(`${basepath}/${file}`, allFiles);
    } else if (stats.isFile()) {
      if (file == "package.json") {
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
      "The following is a repository that needs a better README\n";
    const basePath: string = args.path;

    try {
      // Fetch files in the root
      const allFiles: string = recursiveRead(basePath, "");
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
        ref: args.b ? args.b : "main",
      });

      prompt += `Here is the current README: ${existingREADME.data.content}\n`;
    } catch (err: any) {
      if (err.status === 404) {
        prompt += `There is no README for this repo.\n`;
      }
    }

    try {
      prompt +=
        "The following are the last few commit messages from the repo in the pattern Author: <Name> | Message: <Commmit Message>:\n";
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
}
