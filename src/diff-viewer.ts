import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { outputChannel } from "./extension";

export class DiffViewer {
    private tempDir: string;
    private currentTempFile: string | null = null;
    private originalUri: vscode.Uri | null = null;
    private diffUri: vscode.Uri | null = null;

    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'cursor-diff-apply-pro');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async showDiffBlocks(originalUri: vscode.Uri, rawDiffContent: string): Promise<void> {
        this.originalUri = originalUri;
        const fileName = path.basename(originalUri.fsPath);
        const timestamp = Date.now();
        const tempFilePath = path.join(this.tempDir, `diff_${timestamp}_${fileName}`);

        const formattedDiff = this.formatDiffContent(rawDiffContent, fileName);

        fs.writeFileSync(tempFilePath, formattedDiff, 'utf8');
        this.currentTempFile = tempFilePath;
        this.diffUri = vscode.Uri.file(tempFilePath);

        await vscode.commands.executeCommand(
            'vscode.diff',
            originalUri,
            this.diffUri,
            `${fileName} ↔ Optimized`,
            { 
                preview: false,
                viewColumn: vscode.ViewColumn.One
            }
        );
    }

    private formatDiffContent(rawDiffContent: string, fileName: string): string {
        const header = `/*
        * Optimization suggestion for ${fileName}
        *
        * Click "Apply" to apply the optimization.
        */

        `;

        const cleanedDiff = rawDiffContent
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');

        return header + cleanedDiff;
    }

    getUris(): { original: vscode.Uri | null, diff: vscode.Uri | null } {
        return {
            original: this.originalUri,
            diff: this.diffUri
        };
    }

    isOpen(): boolean {
        return this.originalUri !== null && this.diffUri !== null;
    }

    async close(): Promise<void> {
        try {
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            if (this.originalUri) {
                const doc = await vscode.workspace.openTextDocument(this.originalUri);
                await vscode.window.showTextDocument(doc);
            }

            this.cleanup();
        } catch (error) {
            outputChannel.appendLine(`Error closing diff viewer: ${error}`);
            this.cleanup();
        }
    }

    cleanup(): void {
        if (this.currentTempFile && fs.existsSync(this.currentTempFile)) {
            try {
                fs.unlinkSync(this.currentTempFile);
                this.currentTempFile = null;
            } catch (error) {
                outputChannel.appendLine(`Failed to delete temp file: ${error}`);
            }
        }
        this.currentTempFile = null;
        this.originalUri = null;
        this.diffUri = null;
    }

    cleanupAll(): void {
        try {
            if (fs.existsSync(this.tempDir)) {
                const files = fs.readdirSync(this.tempDir);
                for (const file of files) {
                    if (file.startsWith('optimized_')) {
                        fs.unlinkSync(path.join(this.tempDir, file))
                    }
                }
            }
        } catch (error) {
            outputChannel.appendLine(`Failed to cleanup temp files: ${error}`);
        }
    }
}