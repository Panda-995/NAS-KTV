import OpenAI from 'openai';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import logger from '../logger';

// AI配置接口
export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

// 默认配置
const DEFAULT_CONFIG: AiConfig = {
  baseUrl: '',
  apiKey: '',
  model: 'gpt-4o-mini',
  enabled: false
};

// 容错处理：schema 中未定义 systemSettings 表，复用结构相同的 settings 表（key/value）
const AI_CONFIG_KEY = 'ai_config';

/**
 * 获取AI配置
 */
export async function getAiConfig(): Promise<AiConfig> {
  try {
    const configRow = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, AI_CONFIG_KEY))
      .get();

    if (configRow) {
      const config = JSON.parse(configRow.value ?? '{}');
      const merged = { ...DEFAULT_CONFIG, ...config };
      if (merged.baseUrl && merged.apiKey) {
        logger.info('[AI Config] source=db baseUrl=%s model=%s enabled=%s apiKey=%s', merged.baseUrl, merged.model, merged.enabled, merged.apiKey.substring(0, 8) + '****');
        return merged;
      }
    }

    const envBaseUrl = process.env.AI_BASE_URL || '';
    const envApiKey = process.env.AI_API_KEY || '';
    const envModel = process.env.AI_MODEL || 'gpt-4o-mini';
    const envEnabled = process.env.AI_ENABLED === 'true';

    if (envBaseUrl || envApiKey) {
      logger.info('[AI Config] source=env baseUrl=%s model=%s enabled=%s apiKey=%s', envBaseUrl, envModel, envEnabled, envApiKey ? envApiKey.substring(0, 8) + '****' : '(empty)');
      return {
        baseUrl: envBaseUrl,
        apiKey: envApiKey,
        model: envModel,
        enabled: envEnabled,
      };
    }

    logger.warn('[AI Config] source=none (no config in db or env)');
    return DEFAULT_CONFIG;
  } catch (error) {
    logger.error('Failed to get AI config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 更新AI配置
 */
export async function updateAiConfig(config: Partial<AiConfig>): Promise<AiConfig> {
  const currentConfig = await getAiConfig();
  const newConfig = { ...currentConfig, ...config };

  // 检查配置是否已存在
  const existing = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, AI_CONFIG_KEY))
    .get();

  if (!existing) {
    // 创建新配置
    db
      .insert(schema.settings)
      .values({
        key: AI_CONFIG_KEY,
        value: JSON.stringify(newConfig)
      })
      .run();
  } else {
    // 更新现有配置
    db
      .update(schema.settings)
      .set({ value: JSON.stringify(newConfig) })
      .where(eq(schema.settings.key, AI_CONFIG_KEY))
      .run();
  }

  return newConfig;
}

/**
 * 创建OpenAI客户端
 */
export async function createAIClient(): Promise<OpenAI | null> {
  const config = await getAiConfig();

  if (!config.enabled || !config.baseUrl || !config.apiKey) {
    return null;
  }

  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });
}

/**
 * 调用AI Chat Completion
 */
export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const client = await createAIClient();
  if (!client) {
    throw new Error('AI client not configured or disabled');
  }

  const config = await getAiConfig();

  logger.info('[AI Request] url=%s model=%s', config.baseUrl, config.model);
  logger.info('[AI Request] messages=%j', messages);

  let response: any;
  try {
    response = await client.chat.completions.create({
      model: config.model,
      messages: messages as any,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1000,
    });
  } catch (err) {
    logger.error('[AI Error] request failed:', err);
    throw err;
  }

  const content = response.choices?.[0]?.message?.content || null;
  const reasoningContent = (response.choices?.[0]?.message as any)?.reasoning_content || null;
  logger.info('[AI Response] id=%s model=%s finishReason=%s', response.id, response.model, response.choices?.[0]?.finish_reason);
  if (reasoningContent) {
    logger.info('[AI Response] reasoning_content=%s', reasoningContent.substring(0, 1000));
  }
  logger.info('[AI Response] content=%s', content?.substring(0, 2000) || '(null)');
  logger.info('[AI Response] usage=%j', response.usage);

  return content;
}

/**
 * 测试AI连接
 */
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  model?: string;
}> {
  try {
    const config = await getAiConfig();

    if (!config.baseUrl || !config.apiKey) {
      return {
        success: false,
        message: 'AI配置不完整，请设置Base URL和API Key'
      };
    }

    const client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    });

    // 发送简单的测试请求
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: 'Hello, this is a test. Please reply with "OK".' }],
      max_tokens: 10,
    });

    const reply = response.choices[0]?.message?.content;

    return {
      success: true,
      message: `连接成功，AI回复: ${reply}`,
      model: config.model
    };
  } catch (error) {
    return {
      success: false,
      message: `连接失败: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
