[View code on GitHub](https://github.com/context-labs/babyagi-ts/src/cli/utils/LLMUtil.ts)

This code is responsible for interacting with the OpenAI API to generate embeddings and completions using different language models. It imports the necessary classes and types from the `openai` package and the project's `types.js` file. The code checks if the `OPENAI_API_KEY` environment variable is set, and initializes the `openai` instance with the API key.

The `models` object contains details about three different language models (GPT3, GPT4, and GPT432k), including their names, input and output costs per 1K tokens, and maximum token lengths.

The `createEmbedding` function takes a string as input and returns a Promise that resolves to an array of numbers representing the embedding. It calls the `openai.createEmbedding` method with the input string and the model name `text-embedding-ada-002`.

The `CreateCompletionParams` interface defines the parameters for the `createCompletion` function, which generates completions based on a given prompt and other optional parameters. The function constructs a `messages` array with a single system message containing the prompt, and sends a POST request to the OpenAI API's `/v1/chat/completions` endpoint with the necessary headers and parameters. It then extracts the completion result from the API response and returns it as a string.

Example usage of these functions in the larger project might involve generating embeddings for text inputs or generating completions for prompts using the specified language models:

```javascript
const embedding = await createEmbedding("This is a sample text.");
console.log(embedding);

const completion = await createCompletion({
  model: LLMModels.GPT3,
  prompt: "Write a short story about a robot.",
  temperature: 0.7,
  max_tokens: 100,
});
console.log(completion);
```

These functions can be used to integrate the OpenAI API's capabilities into the babyagi-ts project, enabling it to generate embeddings and completions for various use cases.
## Questions: 
 1. **Question:** What is the purpose of the `models` object and its properties?
   **Answer:** The `models` object is a record that maps the names of different LLMModels (GPT3, GPT4, and GPT432k) to their respective details, such as name, inputCostPer1KTokens, outputCostPer1KTokens, and maxLength.

2. **Question:** How does the `createEmbedding` function work and what does it return?
   **Answer:** The `createEmbedding` function takes a string value as input and sends a request to the OpenAI API to create an embedding for the given input using the 'text-embedding-ada-002' model. It returns a Promise that resolves to an array of numbers representing the embedding.

3. **Question:** What is the purpose of the `createCompletion` function and what parameters does it accept?
   **Answer:** The `createCompletion` function is used to generate a completion for a given prompt using the OpenAI API. It accepts an object with properties such as model, prompt, temperature, max_tokens, top_p, frequency_penalty, and presence_penalty.