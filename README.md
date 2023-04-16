# BabyAGI-ts

This is an attempt to port [@yoheinakajima](https://twitter.com/yoheinakajima)'s [BabyAGI](https://github.com/yoheinakajima/babyagi) from Python to TypeScript and provide a friendly CLI tool that can be installed as a global NPM module. A few small adjustments have been made:

1. The dependency on Pincone has been removed in favor of using [HNSW](https://www.npmjs.com/package/hnswlib-node). This allows developers to get started more easily without having to make a Pinecone account and pay for an index.
2. Configuration has been moved from environment variables to an [Inquirer.js](https://www.npmjs.com/package/inquirer) flow.

All other functionality remains the same.

## Getting started

Export your OpenAI API Key:
```bash
export OPENAI_API_KEY=<YOUR_API_KEY>
```

Install the `babyagi` NPM module globally:

```bash
npm install -g babyagi
```

Create a new directory for your agent to live:

```bash
mkdir travel-gpt
```

Move into the directory:
```bash
cd travel-gpt
```

Create a new agent:
```bash
babyagi run
```

This will begin the agent creation flow. You should see a screen like this:

<img src="https://raw.githubusercontent.com/context-labs/babyagi-ts/master/assets/babyagi-config.png" alt="Markdownify" width="60%" style="border-radius:24px;">

After you finish the agent configuration your agent will start running.


# Warning
This script is designed to be run continuously as part of a task management system. Running this script continuously can result in high API usage, so please use it responsibly. Additionally, the script requires the OpenAI API to be set up correctly, so make sure you have set up the API before running the script.


# Credit
This project is a port of [@yoheinakajima](https://twitter.com/yoheinakajima)'s [BabyAGI](https://github.com/yoheinakajima/babyagi). All credit goes to Yohei and everyone else who has contributed to the BabyAGI project.



