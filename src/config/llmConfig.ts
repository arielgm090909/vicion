export interface LLMConfig {
    temperature: number;
    topK: number;
    topP: number;
    maxOutputTokens: number;
    memoryEnabled: boolean;
    messageHistorySize: number;
    memoryWindow: number;
}

export const defaultConfig: LLMConfig = {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2000,
    memoryEnabled: true,
    messageHistorySize: 50,
    memoryWindow: 10
};

export function createCustomConfig(params: Partial<LLMConfig>): LLMConfig {
    return { ...defaultConfig, ...params };
}
