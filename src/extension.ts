import * as vscode from "vscode";
import { CodeAnalyzer } from "./analyzer";
import { MorphClient } from "./morph-client";

let analyzer: CodeAnalyzer;
let morphClient: MorphClient;
export let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel("Cursor Diff Apply Pro");
    outputChannel.show();
    outputChannel.appendLine("Cursor Diff Apply Pro is now active!");

    analyzer = new CodeAnalyzer();
    morphClient = new MorphClient();
    
    let analyzeCommand = vscode.commands.registerCommand("diff-apply-pro.analyzeFile", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        const document = editor.document;
        vscode.window.showInformationMessage("Analyzing code... Please wait.");

        try {
            const result = await analyzer.analyzeDocument(document);

            if (!result.diffContent || result.diffContent.trim() == '') {
                vscode.window.showInformationMessage("No optimization opportunities found.");
                return; // early exit if no diff
            } else {
                vscode.window.showInformationMessage(`Analysis complete.`);
            }

            outputChannel.appendLine(result.diffContent);

            const choice = await vscode.window.showInformationMessage(
                "Optimizations found. Would you like to apply them?",
                "Apply", "Show Diff", "Cancel"
            )

            if (choice == "Apply") {
                try {
                    vscode.window.showInformationMessage("Applying diff...");
                    const originalCode = document.getText();
                    const modifiedCode = await morphClient.applyDiff(originalCode, result.diffContent);

                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(
                        document.lineAt(0).range.start,
                        document.lineAt(document.lineCount - 1).range.end
                    )
                    edit.replace(document.uri, fullRange, modifiedCode);

                    const success = await vscode.workspace.applyEdit(edit);

                    if (success) {
                        vscode.window.showInformationMessage("Optimizations applied successfully.");
                        outputChannel.appendLine("Optimizations applied successfully.");
                    } else {
                        vscode.window.showErrorMessage("Failed to apply optimizations.");
                        outputChannel.appendLine("Failed to apply optimizations.");
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to apply optimizations: ${error}`);
                    outputChannel.appendLine(`Failed to apply optimizations: ${error}`);
                }
            } else if (choice == "Show Diff") {
                outputChannel.show();
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
            outputChannel.appendLine(`Analysis failed: ${error}`);
        }
    });

    context.subscriptions.push(analyzeCommand);
}

export function deactivate() {}