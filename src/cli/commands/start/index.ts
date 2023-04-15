import path from 'node:path';
import fs from 'node:fs';
import * as LLMUtil from '../../utils/LLMUtil.js';
import { BabyAGIConfig } from '../../../types.js';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { HNSWLib } from '../../../langchain/hnswlib.js';

export const start = async ({
  objective,
  initialTask,
  llm,
  root,
}: BabyAGIConfig) => {
  const vectorStorePath = path.join(root, 'data');
  const vectorStoreExists = fs.existsSync(
    path.join(vectorStorePath, 'args.json'),
  );
  const vectorStore = await (async () => {
    if (vectorStoreExists) {
      console.log('ETIG VECTO');
      return await HNSWLib.load(vectorStorePath, new OpenAIEmbeddings());
    }

    const store = await HNSWLib.fromDocuments(
      [{ pageContent: 'text', metadata: { test: true } }],
      new OpenAIEmbeddings(),
    );
    console.log('NEW VECTO');
    await store.save(vectorStorePath);
    return store;
  })();

  type Task = {
    taskId: number;
    taskName: string;
  };

  // Task list
  let taskId = 1;
  let taskList: Task[] = [
    { taskId: 1, taskName: initialTask }, // Add the first task
  ];
  async function taskCreationAgent(
    objective: string,
    result: { data: string },
    task_description: string,
    taskList: string[],
  ): Promise<Task[]> {
    const prompt = `
    You are a task creation AI that uses the result of an execution agent to create new tasks with the following objective: ${objective},
    The last completed task has the result: ${result}.
    This result was based on this task description: ${task_description}. These are incomplete tasks: ${taskList.join(
      ', ',
    )}.
    Based on the result, create new tasks to be completed by the AI system that do not overlap with incomplete tasks.
    Return the tasks as an array.`;

    const response = await LLMUtil.createCompletion({
      model: llm,
      prompt,
    });

    const newTasks: string[] = response.includes('\n')
      ? response.split('\n')
      : [response];

    return newTasks.map((taskName) => ({ taskId: taskId++, taskName }));
  }

  async function prioritizationAgent(thisTaskId: number) {
    const taskNames = taskList.map((t) => t.taskName);
    const next_taskId = thisTaskId + 1;
    const prompt = `
    You are a task prioritization AI tasked with cleaning the formatting of and reprioritizing the following tasks: ${taskNames}.
    Consider the ultimate objective of your team:${objective}.
    Do not remove any tasks. Return the result as a numbered list, like:
    #. First task
    #. Second task
    Start the task list with number ${next_taskId}.`;

    const response = await LLMUtil.createCompletion({
      model: llm,
      prompt,
    });

    const newTasks = response.includes('\n')
      ? response.split('\n')
      : [response];
    taskList = [];
    for (const task_string of newTasks) {
      console.log(task_string);
      const [id, name] = task_string.trim().split('.', 2);
      const taskId = parseInt(id.trim());
      const taskName = name.trim();
      taskList.push({ taskId, taskName });
    }
  }

  async function executionAgent(
    objective: string,
    task: string,
  ): Promise<string> {
    const context = await contextAgent({ query: objective, topResultsNum: 5 });
    const prompt = `
    You are an AI who performs one task based on the following objective: ${objective}
.
    Take into account these previously completed tasks: ${context}
.
    Your task: ${task}
    Response:
  `;
    return LLMUtil.createCompletion({
      prompt,
      model: llm,
      max_tokens: 2000,
    });
  }

  async function contextAgent({
    query,
    topResultsNum,
  }: {
    query: string;
    topResultsNum: number;
  }) {
    const embedding = await LLMUtil.createEmbedding(query);
    const results = await vectorStore.similaritySearchVectorWithScore(
      embedding,
      topResultsNum,
    );

    console.log(JSON.stringify(results, null, 2));

    // const sorted_results = results.matches.sort((a, b) => b.score - a.score);
    return results.map(([doc]) => doc.metadata.task);
  }

  while (true) {
    console.log('LOOPING...');
    console.log(`Task list length: ${taskList.length}`);
    if (taskList.length > 0) {
      // Print the task list
      console.log('*****TASK LIST*****');
      for (const t of taskList) {
        console.log(`${t.taskId}: ${t.taskName}`);
      }

      // Step 1: Pull the first task
      const task = taskList.shift();
      if (!task) {
        throw new Error('Task is undefined');
      }

      console.log('*****NEXT TASK*****');
      console.log(`${task.taskId}: ${task.taskName}`);

      // Send to execution function to complete the task based on the context
      const result = await executionAgent(objective, task.taskName);
      const thisTaskId = task.taskId;
      console.log('*****TASK RESULT*****');
      console.log(result);

      // Step 2: Enrich result and store in Pinecone
      const enriched_result = { data: result };
      const result_id = `result_${task.taskId}`;
      console.log({
        pageContent: enriched_result.data,
        metadata: { result_id, task: task.taskName, result },
      });
      await vectorStore.addDocuments([
        {
          pageContent: enriched_result.data,
          metadata: { result_id, task: task.taskName, result },
        },
      ]);

      console.log('*****Creating New Tasks*****');
      // Step 3: Create new tasks and reprioritize task list
      const newTasks = await taskCreationAgent(
        objective,
        enriched_result,
        task.taskName,
        taskList.map((t) => t.taskName),
      );

      console.log('*****New Tasks*****');
      for (const newTask of newTasks) {
        taskList.push(newTask);
      }
      await prioritizationAgent(thisTaskId);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Sleep before checking the task list again
  }
};

export default {
  start,
};
