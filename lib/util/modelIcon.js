/**
 * 獲取模型對應的圖示路徑
 * @param {string} modelName - 模型名稱
 * @returns {string} 圖示路徑
 */
export function getModelIcon(modelName) {
  if (!modelName) return '/imgs/models/default.svg';

  // 將模型名稱轉換為小寫以便比較
  const lowerModelName = modelName.toLowerCase();

  // 定義已知模型字首對映
  const modelPrefixes = [
    { prefix: 'doubao', icon: 'doubao.svg' },
    { prefix: 'qwen', icon: 'qwen.svg' },
    { prefix: 'gpt', icon: 'gpt.svg' },
    { prefix: 'gemini', icon: 'gemini.svg' },
    { prefix: 'claude', icon: 'claude.svg' },
    { prefix: 'llama', icon: 'llama.svg' },
    { prefix: 'mistral', icon: 'mistral.svg' },
    { prefix: 'yi', icon: 'yi.svg' },
    { prefix: 'deepseek', icon: 'deepseek.svg' },
    { prefix: 'chatglm', icon: 'chatglm.svg' },
    { prefix: 'wenxin', icon: 'wenxin.svg' },
    { prefix: 'glm', icon: 'glm.svg' },
    { prefix: 'hunyuan', icon: 'hunyuan.svg' }
  ];

  // 查詢匹配的模型字首
  const matchedPrefix = modelPrefixes.find(({ prefix }) => lowerModelName.includes(prefix));

  // 返回對應的圖示路徑，如果沒有匹配則返回預設圖示
  return `/imgs/models/${matchedPrefix ? matchedPrefix.icon : 'default.svg'}`;
}
