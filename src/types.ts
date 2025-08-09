export interface OpenRouterRequest {
    model: string;
    messages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
    }>;
    max_tokens?: number;
    temperature?: number;
}

export interface OpenRouterResponse {
    choices: Array<{
        message: {
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface DiffAnalysisResult {
    diffContent: string; // raw diff-style output from the coder model
    fileHash: string;
    timestamp: number;
}