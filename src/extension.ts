import * as vscode from "vscode";
import { CodeAnalyzer } from "./analyzer";

let analyzer: CodeAnalyzer;
export let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel("Cursor Diff Apply Pro");
    outputChannel.show();
    outputChannel.appendLine("Cursor Diff Apply Pro is now active!");

    analyzer = new CodeAnalyzer();
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
            } else {
                vscode.window.showInformationMessage(`Analysis complete. Check output for diff.`);
            }

            outputChannel.appendLine(result.diffContent);

            // TODO: call diff-apply model
            // const modifiedCode = await applyDiffAPI(document.getText(), result.diffContent);
            // TODO: replace the document with the modified code

        } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
        }
    });

    context.subscriptions.push(analyzeCommand);
}

export function deactivate() {}