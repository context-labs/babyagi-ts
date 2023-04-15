import { createChatCompletion } from './autogpt/llmUtils';

let nextKey = 0;
const agents: Record<
  number,
  [string, { role: string; content: string }[], string]
> = {};

// Create new GPT agent
// TODO: Centralise use of createChatCompletion() to globally enforce token limit

export function createAgent(
  task: string,
  prompt: string,
  model: string,
): [number, string] {
  const messages = [{ role: 'user', content: prompt }];

  // Start GPT instance
  const agentReply = createChatCompletion(model, messages);

  // Update full message history
  messages.push({ role: 'assistant', content: agentReply });

  const key = nextKey;
  // This is done instead of Object.keys(agents).length to make keys unique even if agents
  // are deleted
  nextKey += 1;

  agents[key] = [task, messages, model];

  return [key, agentReply];
}

export function messageAgent(key: number, message: string): string {
  const [_task, messages, model] = agents[key];

  // Add user message to message history before sending to agent
  messages.push({ role: 'user', content: message });

  // Start GPT instance
  const agentReply = createChatCompletion(model, messages);

  // Update full message history
  messages.push({ role: 'assistant', content: agentReply });

  return agentReply;
}

export function listAgents(): [number, string][] {
  // Return a list of agent keys and their tasks
  return Object.entries(agents).map(([key, [task]]) => [parseInt(key), task]);
}

export function deleteAgent(key: number): boolean {
  if (agents.hasOwnProperty(key)) {
    delete agents[key];
    return true;
  } else {
    return false;
  }
}
