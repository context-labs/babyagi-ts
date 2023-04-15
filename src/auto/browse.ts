import { parse as urlparse } from 'url';
import path from 'node:path';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Config } from './config';
import { createChatCompletion } from './llm_utils';
import { getMemory } from './memory';

const cfg = new Config();
const memory = getMemory(cfg);

const session = axios.create({
  headers: { 'User-Agent': cfg.userAgent },
});

export function isValidUrl(url: string): boolean {
  try {
    const result = urlparse(url);
    return !!(result.protocol && result.hostname);
  } catch (error) {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  return path.join(url, urlparse(url).pathname || '');
}

export function checkLocalFileAccess(url: string): boolean {
  const localPrefixes = [
    'file:///',
    'file://localhost',
    'http://localhost',
    'https://localhost',
  ];
  return localPrefixes.some((prefix) => url.startsWith(prefix));
}

export async function getResponse(
  url: string,
  timeout = 10000,
): Promise<[any, string | null]> {
  try {
    if (checkLocalFileAccess(url)) {
      throw new Error('Access to local files is restricted');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Invalid URL format');
    }

    const sanitizedUrl = sanitizeUrl(url);
    const response = await session.get(sanitizedUrl, { timeout });

    if (response.status >= 400) {
      return [null, `Error: HTTP ${response.status} error`];
    }

    return [response, null];
  } catch (error: any) {
    return [null, `Error: ${error.message}`];
  }
}

export async function scrapeText(url: string): Promise<string> {
  const [response, errorMessage] = await getResponse(url);
  if (errorMessage) {
    return errorMessage;
  }
  if (!response) {
    return 'Error: Could not get response';
  }

  const dom = new JSDOM(response.data);
  const document = dom.window.document;

  const scripts = document.querySelectorAll('script, style');
  scripts.forEach((script: string) => script.trim());

  const text = document.body.textContent || '';
  const lines = text.split('\n').map((line: string) => line.trim());
  const chunks = lines.flatMap((line: string) =>
    line.split('  ').map((phrase: string) => phrase.trim()),
  );
  const filteredText = chunks.filter((chunk) => chunk).join('\n');

  return filteredText;
}

function extractHyperlinks(document: Document): [string, string][] {
  const hyperlinks: [string, string][] = [];
  const links = document.querySelectorAll('a[href]');
  links.forEach((link) => {
    hyperlinks.push([link.textContent || '', link.getAttribute('href') || '']);
  });
  return hyperlinks;
}

function formatHyperlinks(hyperlinks: [string, string][]): string[] {
  return hyperlinks.map(([linkText, linkUrl]) => `${linkText} (${linkUrl})`);
}

export async function scrapeLinks(url: string): Promise<string[]> {
  const [response, errorMessage] = await getResponse(url);
  if (errorMessage) {
    return [errorMessage];
  }
  if (!response) {
    return ['Error: Could not get response'];
  }

  const dom = new JSDOM(response.data);
  const document = dom.window.document;

  const scripts = document.querySelectorAll('script, style');
  scripts.forEach((script) => script.remove());

  const hyperlinks = extractHyperlinks(document);

  return formatHyperlinks(hyperlinks);
}

function* splitText(
  text: string,
  maxLength = cfg.browseChunkMaxLength,
): Generator<string> {
  const paragraphs = text.split('\n');
  let currentLength = 0;
  let currentChunk: string[] = [];

  for (const paragraph of paragraphs) {
    if (currentLength + paragraph.length + 1 <= maxLength) {
      currentChunk.push(paragraph);
      currentLength += paragraph.length + 1;
    } else {
      yield currentChunk.join('\n');
      currentChunk = [paragraph];
      currentLength = paragraph.length + 1;
    }
  }

  if (currentChunk.length > 0) {
    yield currentChunk.join('\n');
  }
}

function createMessage(
  chunk: string,
  question: string,
): { role: string; content: string } {
  return {
    role: 'user',
    content: `"""${chunk}""" Using the above text, please answer the following question: "${question}" -- if the question cannot be answered using the text, please summarize the text.`,
  };
}

export async function summarizeText(
  url: string,
  text: string,
  question: string,
): Promise<string> {
  if (!text) {
    return 'Error: No text to summarize';
  }

  const textLength = text.length;
  console.log(`Text length: ${textLength} characters`);

  const summaries: string[] = [];
  const chunks = Array.from(splitText(text));

  for (const [i, chunk] of chunks.entries()) {
    console.log(`Adding chunk ${i + 1} / ${chunks.length} to memory`);

    const memoryToAdd = `Source: ${url}\nRaw content part#${i + 1}: ${chunk}`;
    memory.add(memoryToAdd);

    console.log(`Summarizing chunk ${i + 1} / ${chunks.length}`);
    const messages = [createMessage(chunk, question)];

    const summary = await createChatCompletion(
      cfg.fastLlmModel,
      messages,
      cfg.browseSummaryMaxToken,
    );
    summaries.push(summary);
    console.log(`Added chunk ${i + 1} summary to memory`);

    const memoryToAddSummary = `Source: ${url}\nContent summary part#${
      i + 1
    }: ${summary}`;
    memory.add(memoryToAddSummary);
  }

  console.log(`Summarized ${chunks.length} chunks.`);

  const combinedSummary = summaries.join('\n');
  const messages = [createMessage(combinedSummary, question)];

  const finalSummary = await createChatCompletion(
    cfg.fastLlmModel,
    messages,
    cfg.browseSummaryMaxToken,
  );

  return finalSummary;
}
