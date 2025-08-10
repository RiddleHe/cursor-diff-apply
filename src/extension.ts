import * as vscode from "vscode";
import { CodeAnalyzer } from "./analyzer";
import { MorphClient } from "./morph-client";
import { DiffViewer } from "./diff-viewer";

let analyzer: CodeAnalyzer;
let morphClient: MorphClient;
let diffViewer: DiffViewer;

// session states
let currentDocument: vscode.TextDocument | null = null;
let currentOriginalContent: string = '';
let currentDiffContent: string = '';
let currentOptimizedContent: string = '';

export let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel("Cursor Diff Apply Pro");
    // outputChannel.show();
    outputChannel.appendLine("Cursor Diff Apply Pro is now active!");

    analyzer = new CodeAnalyzer();
    morphClient = new MorphClient();
    diffViewer = new DiffViewer();
    
    let analyzeCommand = vscode.commands.registerCommand("diff-apply-pro.analyzeFile", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        currentDocument = editor.document;
        currentOriginalContent = currentDocument.getText();

        try {
            // Generate diff
            vscode.window.showInformationMessage('Analyzing code for optimization...');

            const result = await analyzer.analyzeDocument(currentDocument);

            if (!result.diffContent || result.diffContent.trim() === '') {
                vscode.window.showInformationMessage("No optimization opportunities found.");
                return; // early exit if no diff
            }

            currentDiffContent = result.diffContent;
            outputChannel.appendLine(currentDiffContent);

            // Generate optimized code given diff
            const optimizedContent = await morphClient.applyDiff(currentOriginalContent, currentDiffContent);

            if (!optimizedContent || optimizedContent.trim() === '') {
                vscode.window.showInformationMessage('Failed to generate optimized code.');
                return;
            }
            outputChannel.appendLine(`Optimized code generated, length ${optimizedContent.length}`);

            currentOptimizedContent = optimizedContent;

            // Show diff view
            await diffViewer.showCompleteFiles(currentDocument.uri, currentOriginalContent, currentOptimizedContent);

            // Show apply option
            const choice = await vscode.window.showInformationMessage(
                "Optimizations found. Review the diff and decide if you want to apply them.",
                "Apply All", "Cancel"
            );

            if (choice == "Apply All") {
                await vscode.commands.executeCommand('diff-apply-pro.applyOptimizations');
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
            outputChannel.appendLine(`Analysis failed: ${error}`);
        }
    });

    let applyCommand = vscode.commands.registerCommand('diff-apply-pro.applyOptimizations', async () => {
        if (!currentDocument || !currentDiffContent || !currentOriginalContent) {
            vscode.window.showWarningMessage('No optimization to apply. Run analysis first.');
            return;
        }

        try {
            vscode.window.showInformationMessage('Applying optimizations...');
            outputChannel.appendLine('Applying optimizations...');

            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                currentDocument.lineAt(0).range.start,
                currentDocument.lineAt(currentDocument.lineCount - 1).range.end
            );
            edit.replace(currentDocument.uri, fullRange, currentOptimizedContent);

            const success = await vscode.workspace.applyEdit(edit);

            if (success) {
                await currentDocument.save();
                outputChannel.appendLine(`File saved successfully.`);

                await diffViewer.close();

                currentDocument = null;
                currentDiffContent = '';
                currentOriginalContent = '';
                currentOptimizedContent = '';

                vscode.window.showInformationMessage(`Optimization applied and saved!`);
            } else {
                vscode.window.showErrorMessage('Failed to apply optimizations.');
                outputChannel.appendLine('Failed to apply optimizations.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to apply optimizations: ${error}`);
            outputChannel.appendLine(`Failed to apply optimizations: ${error}`);
        }
    });

    let cancelCommand = vscode.commands.registerCommand('diff-apply-pro.cancelOptimizations', async() => {
        await diffViewer.close();

        currentDocument = null;
        currentDiffContent = '';
        currentOriginalContent = '';
        currentOptimizedContent = '';

        vscode.window.showInformationMessage('Optimization session cancelled.');
        outputChannel.appendLine('Optimization session cancelled.');
    });

    context.subscriptions.push(analyzeCommand, applyCommand, cancelCommand);
}

export function deactivate() {
    if (diffViewer) {
        diffViewer.cleanupAll();
    }
}