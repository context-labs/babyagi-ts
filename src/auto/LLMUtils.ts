import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

export interface OpenAIStreamPayload {
  model: string;
  prompt: string;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export async function createChatCompletionStream(
  params: OpenAIStreamPayload,
  callback?: (completion: string) => void,
): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let compeletion = '';
  // let counter = 0;

  const { prompt, ...rest } = params;
  const messages = [{ role: 'user', content: prompt }];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
    },
    method: 'POST',
    body: JSON.stringify({
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: true,
      n: 1,
      messages,
      ...rest,
    }),
  });

  const stream = new ReadableStream({
    async start(controller) {
      // callback
      function onParse(event: ParsedEvent | ReconnectInterval) {
        if (event.type === 'event') {
          const data = event.data;
          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (data === '[DONE]') {
            callback?.(compeletion);
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const text = json.choices[0]?.delta?.content;
            // if (counter < 2 && (text.match(/\n/) || []).length) {
            //   console.log('hit here');
            //   // this is a prefix character (i.e., "\n\n"), do nothing
            //   return;
            // }
            const queue = encoder.encode(text);
            // Update the total completion
            compeletion += decoder.decode(queue);

            // Enqueue the chunk into the target stream
            controller.enqueue(queue);
            // counter++;
          } catch (e) {
            // maybe parse error
            controller.error(e);
          }
        }
      }

      // stream response (SSE) from OpenAI may be fragmented into multiple chunks
      // this ensures we properly read chunks and invoke an event for each SSE event stream
      const parser = createParser(onParse);
      // https://web.dev/streams/#asynchronous-iteration
      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
}
