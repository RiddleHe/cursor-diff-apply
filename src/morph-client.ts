import axios, { AxiosResponse } from "axios";
import * as vscode from "vscode";
import { outputChannel } from "./extension";

interface MorphRequest {
    model: string;
    messages: Array<{
        role: string;
        content: string;
    }>;
}

interface MorphResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export class MorphClient {
    private readonly baseUrl = "https://api.morphllm.com/v1";
    private readonly model = "morph-v3-large";

    private getApiKey(): string {
        const config = vscode.workspace.getConfiguration('diff-apply-pro');
        const apiKey = config.get<string>("morphApiKey", '');

        if (!apiKey) {
            throw new Error("Morph API key is not configured.");
        }
        return apiKey;
    }

    async applyDiff(original: string, diffContent: string): Promise<string> {
        const apiKey = this.getApiKey();
        const instruction = "Apply the optimization changes specified in the update section to improve code performance and reduce complexity. maintain the original functionality."
        const content = `<instruction>${instruction}</instruction>\n<code>${original}</code>\n<update>${diffContent}</update>`

        const request: MorphRequest = {
            model: this.model,
            messages: [{
                role: "user",
                content: content
            }]
        };

        try {
            const response: AxiosResponse<MorphResponse> = await axios.post(
                `${this.baseUrl}/chat/completions`,
                request,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const modifiedCode = response.data.choices[0]?.message?.content || '';
            outputChannel.appendLine(`Morph code received, length: ${modifiedCode.length}`);
            outputChannel.appendLine(`Morph code: ${modifiedCode}`);

            return modifiedCode;

        } catch (error: any) {
            outputChannel.appendLine(`Morph API error: ${error}`);
            throw new Error(`Failed to apply diff: ${error.message}`);
        }
    }
}