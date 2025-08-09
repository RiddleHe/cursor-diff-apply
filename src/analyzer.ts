import * as vscode from "vscode";
import { OpenRouterClient } from "./openrouter-client";
import { DiffAnalysisResult } from "./types"; 
import { outputChannel } from "./extension";

export class CodeAnalyzer {
    private client: OpenRouterClient;
    private cache: Map<string, DiffAnalysisResult>;

    constructor() {
        this.client = new OpenRouterClient();
        this.cache = new Map();
    }

    async analyzeDocument(document: vscode.TextDocument): Promise<DiffAnalysisResult> {
        const content = document.getText();
        outputChannel.appendLine(`Document length: ${content.length}`);
        outputChannel.appendLine(`Document language: ${document.languageId}`);

        const fileHash = this.generateHash(content);

        const cached = this.cache.get(fileHash);
        if (cached && Date.now() - cached.timestamp < 300000) {
            outputChannel.appendLine('Returning cached result');
            return cached;
        }

        try {
            const language = document.languageId;

            outputChannel.appendLine('Calling analyzeCode...');
            const diffContent = await this.client.analyzeCode(content, language);
            outputChannel.appendLine(`Raw response: ${diffContent}`);
            outputChannel.appendLine(`Raw response length: ${diffContent.length}`);
            

            const result: DiffAnalysisResult = {
                diffContent,
                fileHash,
                timestamp: Date.now()
            };

            this.cache.set(fileHash, result);
            return result;
        } catch (error) {
            outputChannel.appendLine(`Analysis failed: ${error}`);
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
            return {
                diffContent: '',
                fileHash,
                timestamp: Date.now()
            };
        }
    }

    private generateHash(content: string): string {
        let hash = 0;
        for (let i=0; i<content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    clearCache(): void {
        this.cache.clear();
    }

} 