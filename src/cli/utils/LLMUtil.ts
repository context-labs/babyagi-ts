import {
  Configuration as OpenAIConfiguration,
  OpenAIApi as OpenAIAPI,
} from 'openai';
import { LLMModelDetails, LLMModels } from '../../types.js';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is missing from .env');
  process.exit(1);
}

const openai = new OpenAIAPI(
  new OpenAIConfiguration({
    apiKey: process.env.OPENAI_API_KEY ?? '',
  }),
);

export const models: Record<LLMModels, LLMModelDetails> = {
  [LLMModels.GPT3]: {
    name: LLMModels.GPT3,
    inputCostPer1KTokens: 0.002,
    outputCostPer1KTokens: 0.002,
    maxLength: 3050,
  },
  [LLMModels.GPT4]: {
    name: LLMModels.GPT4,
    inputCostPer1KTokens: 0.03,
    outputCostPer1KTokens: 0.06,
    maxLength: 8192,
  },
  [LLMModels.GPT432k]: {
    name: LLMModels.GPT432k,
    inputCostPer1KTokens: 0.06,
    outputCostPer1KTokens: 0.12,
    maxLength: 32768,
  },
};

export const createEmbedding = async (value: string): Promise<number[]> => {
  const response = await openai.createEmbedding({
    input: value,
    model: 'text-embedding-ada-002',
  });

  const {
    data: { data: results },
  } = response;

  return results?.[0]?.embedding ?? [];
};

export interface CreateCompletionParams {
  model: string;
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export async function createCompletion({
  prompt,
  ...params
}: CreateCompletionParams): Promise<string> {
  const messages = [{ role: 'system', content: prompt }];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
    },
    method: 'POST',
    body: JSON.stringify({
      top_p: 1,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      stream: false,
      n: 1,
      temperature: 0.0,
      messages,
      ...params,
    }),
  });

  const json: any = await res.json();
  const result = json?.choices?.[0]?.message?.content ?? null;
  const final = result ?? '';
  return final;
}
