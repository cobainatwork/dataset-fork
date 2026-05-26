/**
 * Creates an OpenAI-compatible embedding provider.
 * Works with any /v1/embeddings-compatible server (Ollama, vLLM, GPUStack, LM Studio, etc.).
 *
 * @param {Object} config
 * @param {string} config.endpoint - Base API endpoint (must include /v1, e.g. http://localhost:11434/v1)
 * @param {string} config.apiKey - Bearer token (empty string if no auth required)
 * @param {string} config.modelName - Model identifier on remote server
 * @param {number} config.dimension - Embedding vector dimension
 * @returns {Object} Provider instance with embed, embedBatch, dimension, healthCheck
 */
function createOpenAICompatibleProvider({ endpoint, apiKey, modelName, dimension }) {
  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
  };

  // 30 second timeout for embedding requests
  const TIMEOUT_MS = 30000;

  async function embedBatch(texts) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${endpoint}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: modelName, input: texts }),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`Embedding API returned ${res.status}`);
      }

      const json = await res.json();

      if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
        throw new Error('Embedding API returned empty result');
      }

      return json.data.map(d => {
        if (!d.embedding || !Array.isArray(d.embedding)) {
          throw new Error('Embedding API response missing or malformed embedding');
        }
        return new Float32Array(d.embedding);
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Embedding request timeout after ${TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function embed(text) {
    const vectors = await embedBatch([text]);
    return vectors[0];
  }

  async function healthCheck() {
    try {
      const res = await fetch(`${endpoint}/models`, { headers });
      return res.ok;
    } catch {
      return false;
    }
  }

  return { embed, embedBatch, dimension: () => dimension, healthCheck };
}

module.exports = { createOpenAICompatibleProvider };
