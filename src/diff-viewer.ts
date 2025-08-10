import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { outputChannel } from "./extension";

export class DiffViewer {
    private tempDir: string;
    private currentTempFile: string | null = null;

    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'cursor-diff-apply-pro');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async showDiff(originalUri: vscode.Uri, optimizedContent: string): Promise<void> {
        const fileName = path.basename(originalUri.fsPath);
        const timestamp = Date.now();
        const tempFilePath = path.join(this.tempDir, `optimized_${timestamp}_${fileName}`);

        fs.writeFileSync(tempFilePath, optimizedContent, 'utf8');
        this.currentTempFile = tempFilePath;

        const optimizedUri = vscode.Uri.file(tempFilePath);

        // open diff view
        await vscode.commands.executeCommand(
            'vscode.diff',
            originalUri,
            optimizedUri,
            `${fileName} ↔ Optimized`,
            { preview: false, viewColumn: vscode.ViewColumn.One }
        );
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