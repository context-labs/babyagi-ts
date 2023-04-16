# BabyAGI-ts

This is an attempt to port [@yoheinakajima](https://twitter.com/yoheinakajima)'s [BabyAGI](https://github.com/yoheinakajima/babyagi) from Python to TypeScript and provide a friendly CLI tool that can be installed as a global NPM module. A few small adjustments have been made:

1. The dependency on Pincone has been removed in favor of using [HNSW](https://www.npmjs.com/package/hnswlib-node). This allows developers to get started more easily without having to make a Pinecone account and pay for an index.
2. Configuration has been moved from environment variables to an [Inquirer.js](https://www.npmjs.com/package/inquirer) flow.

All other functionality remains the same.

## Getting started

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



