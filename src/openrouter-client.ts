import axios, { AxiosResponse } from "axios";
import * as vscode from "vscode";
import { OpenRouterRequest, OpenRouterResponse } from "./types";
import { outputChannel } from "./extension";

export class OpenRouterClient {
    private readonly baseUrl = "https://openrouter.ai/api/v1";
    private readonly defaultModel = "qwen/qwen3-coder";

    private getApiKey(): string {
        const config = vscode.workspace.getConfiguration("diff-apply-pro");
        const apiKey = config.get<string>("openRouterApiKey", '');

        if (!apiKey) {
            throw new Error("OpenRouter API key is not configured.");
        }

        return apiKey;
    }

    async analyzeCode(code: string, language: string): Promise<string> {
        const apiKey = this.getApiKey();
        const request: OpenRouterRequest = {
            model: this.defaultModel,
            messages: [
                {
                    role: "system",
                    content: `
                    You are a code optimization expert. Analyze the provided ${language} code and identify areas for improvement in these categories:
                    - Performance: Algorithms that are inefficient at runtime or memory-intensive
                    - Complexity: Nested for loops, deeply nested conditionals, duplicate code, etc.

                    Use this tool to make an edit to the existing file.

                    This will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.
                    When writing the edit, you should specify each edit in sequence, with the special comment // ... existing code ... to represent unchanged code in between edited lines.

                    For example:

                    // ... existing code ...
                    FIRST_EDIT
                    // ... existing code ...
                    SECOND_EDIT
                    // ... existing code ...
                    THIRD_EDIT
                    // ... existing code ...

                    You should still bias towards repeating as few lines of the original file as possible to convey the change.
                    But, each edit should contain minimally sufficient context of unchanged lines around the code you're editing to resolve ambiguity.
                    DO NOT omit spans of pre-existing code (or comments) without using the // ... existing code ... comment to indicate its absence. If you omit the existing code comment, the model may inadvertently delete these lines.
                    If you plan on deleting a section, you must provide context before and after to delete it. If the initial code is "code \n Block 1 \n Block 2 \n Block 3 \n code", and you want to remove Block 2, you would output "// ... existing code ... \n Block 1 \n  Block 3 \n // ... existing code ...".
                    Make sure it is clear what the edit should be, and where it should be applied.
                    Make edits to a file in a single edit_file call instead of multiple edit_file calls to the same file. The apply model can handle many distinct edits at once.
                    `
                },
                {
                    role: "user",
                    content: `Analyze this ${language} code: \n\n${code}`
                }
            ],
            max_tokens: 1024,
            temperature: 0.7
        };

        try {
            const response: AxiosResponse<OpenRouterResponse> = await axios.post(
                `${this.baseUrl}/chat/completions`,
                request,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://github.com/RiddleHe/cursor-diff-apply.git',
                        'X-Title': 'Cursor Diff Apply Pro'
                    },
                    timeout: 30000
                }
            );

            outputChannel.appendLine(`Full API response: ${JSON.stringify(response.data, null, 2)}`);
            outputChannel.appendLine(`Choices array: ${JSON.stringify(response.data.choices, null, 2)}`);
            outputChannel.appendLine(`First choice: ${JSON.stringify(response.data.choices?.[0], null, 2)}`);
            outputChannel.appendLine(`Message content: ${response.data.choices?.[0]?.message?.content}`);

            const content = response.data.choices[0]?.message?.content || '';
            outputChannel.appendLine(`Content to return: ${content}`);
            return content;

        } catch (error: any) {
            outputChannel.appendLine('OpenRouter API error:');
            outputChannel.appendLine(`Full URL: ${this.baseUrl}/chat/completions`);
            outputChannel.appendLine(`Model used: ${this.defaultModel}`);
            outputChannel.appendLine(`API key (first 10 chars): ${apiKey.substring(0, 10)}`);

            if (error.response) {
                outputChannel.appendLine(`Response status: ${error.response.status}`);
                outputChannel.appendLine(`Response data: ${error.response.data}`);
                outputChannel.appendLine(`Response headers: ${error.response.headers}`);
            } else if (error.request) {
                outputChannel.appendLine(`No response received: ${error.request}`);
            } else {
                outputChannel.appendLine(`Error setting up request: ${error.message}`);
            }
            
            throw new Error(`API request failed: ${error.response?.data?.error || error.message}`);
        }
    }
}