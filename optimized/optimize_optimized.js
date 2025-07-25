const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
class ClaudeOptimizer {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.baseUrl = 'https:
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }
  async callClaude(prompt, maxTokens = 4000) {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };
    const data = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: prompt
      }]
    };
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const response = await axios.post(this.baseUrl, data, { headers });
        return response.data.content[0].text;
      } catch (error) {
        console.error(`API call failed (attempt ${i + 1}):`, error.message);
        if (i === this.maxRetries - 1) throw error;
        await this.delay(this.retryDelay * (i + 1));
      }
    }
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async optimizeHTML(content, cssFiles, jsFiles) {
    const prompt = `
    XMLビューワのindex.htmlを最適化してください。以下の要件を満たしてください：
    【現在のHTML】
    ${content}
    【利用可能なCSS】
    ${cssFiles.map(f => `- ${f}`).join('\n')}
    【利用可能なJS】
    ${jsFiles.map(f => `- ${f}`).join('\n')}
    【最適化要件】
    1. CSS/JSファイルを適切に読み込む
    2. CALS_EC以外のフォルダも選択可能にする
    3. XMLエラーハンドリングを強化
    4. UI/UXを改善
    5. 速度とパフォーマンスを向上
    最適化されたHTMLのみを出力してください。説明は不要です。
    `;
    return await this.callClaude(prompt);
  }
  async optimizeCSS(content, filename) {
    const prompt = `
    以下のCSSファイル「${filename}」を最適化してください：
    ${content}
    【最適化要件】
    1. 冗長なスタイルを削除
    2. セレクタを最適化
    3. メディアクエリを統合
    4. 変数化可能な値は統一
    5. 読み込み速度を向上
    6. 保守性を向上
    最適化されたCSSのみを出力してください。説明は不要です。
    `;
    return await this.callClaude(prompt);
  }
  async optimizeJS(content, filename) {
    const prompt = `
    以下のJavaScriptファイル「${filename}」を最適化してください：
    ${content}
    【最適化要件】
    1. 冗長なコードを削除
    2. 未使用関数を削除
    3. エラーハンドリングを強化
    4. XMLパース処理を最適化
    5. DOM操作を効率化
    6. 機能が肥大化している場合は分割提案
    最適化されたJavaScriptのみを出力してください。
    分割が必要な場合は「SPLIT_REQUIRED: filename1.js, filename2.js」で開始してください。
    `;
    return await this.callClaude(prompt);
  }
  async splitJavaScript(content, filename) {
    const prompt = `
    以下のJavaScriptファイル「${filename}」を機能単位で分割してください：
    ${content}
    【分割要件】
    1. 意味のある機能単位で分割
    2. ファイル名はkebab-caseまたはcamelCaseで機能を表現
    3. 依存関係を考慮した分割
    4. 例: xmlParser.js, domRenderer.js, fileLoader.js, errorHandler.js
    出力形式：
    [コード]
    [コード]
    `;
    return await this.callClaude(prompt, 8000);
  }
  async analyzeAndCompare(originalPath, optimizedPath) {
    const prompt = `
    XMLビューワの最適化結果を比較評価してください：
    【評価観点】
    1. UI/UX: 使いやすさ、見た目の改善
    2. 速度: 読み込み速度、実行速度
    3. 安定性: エラーハンドリング、堅牢性
    4. 可読性: コードの理解しやすさ
    5. 機能再現性: 元の機能が正しく動作するか
    【判定】
    ACCEPT: 最適化を採用
    REJECT: 最適化を却下
    PARTIAL: 部分的に採用
    判定結果のみを最初の行に出力してください。
    `;
    return await this.callClaude(prompt);
  }
}
class FileManager {
  constructor() {
    this.targetFolder = process.env.TARGET_FOLDER || 'main/CALS_EC/';
    this.outputFolder = process.env.OUTPUT_FOLDER || 'optimized/';
    this.viewerFile = process.env.VIEWER_FILE || 'index.html';
  }
  async ensureDirectories() {
    await fs.ensureDir(this.outputFolder);
    await fs.ensureDir(path.join(this.outputFolder, 'css'));
    await fs.ensureDir(path.join(this.outputFolder, 'js'));
  }
  async readFile(filePath) {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
      return null;
    }
  }
  async writeFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error.message);
      return false;
    }
  }
  async getFileList(dir, extension) {
    try {
      const files = await fs.readdir(dir);
      return files.filter(file => file.endsWith(extension));
    } catch (error) {
      return [];
    }
  }
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }
}
class OptimizationLogger {
  constructor() {
    this.logFile = 'optimization.log';
    this.startTime = Date.now();
  }
  async log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    await fs.appendFile(this.logFile, logEntry);
    console.log(message);
  }
  async logOptimization(filename, originalSize, optimizedSize, processingTime) {
    const reductionRate = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    const message = `Optimized ${filename}: ${originalSize}B → ${optimizedSize}B (${reductionRate}% reduction) in ${processingTime}ms`;
    await this.log(message);
  }
  async logSummary(totalFiles, totalReduction, totalTime) {
    const message = `Summary: ${totalFiles} files optimized, ${totalReduction}B total reduction in ${totalTime}ms`;
    await this.log(message);
  }
}
async function main() {
  const optimizer = new ClaudeOptimizer();
  const fileManager = new FileManager();
  const logger = new OptimizationLogger();
  await logger.log('Starting XML Viewer optimization process...');
  try {
    await fileManager.ensureDirectories();
    const htmlPath = path.join(fileManager.targetFolder, fileManager.viewerFile);
    const htmlContent = await fileManager.readFile(htmlPath);
    if (!htmlContent) {
      await logger.log('HTML file not found, skipping optimization');
      return;
    }
    const cssFiles = await fileManager.getFileList(fileManager.targetFolder, '.css');
    const optimizedCssFiles = [];
    for (const cssFile of cssFiles) {
      const startTime = Date.now();
      const cssPath = path.join(fileManager.targetFolder, cssFile);
      const cssContent = await fileManager.readFile(cssPath);
      if (cssContent) {
        const originalSize = await fileManager.getFileSize(cssPath);
        const optimizedCSS = await optimizer.optimizeCSS(cssContent, cssFile);
        const outputPath = path.join(fileManager.outputFolder, 'css', cssFile);
        await fileManager.writeFile(outputPath, optimizedCSS);
        const optimizedSize = await fileManager.getFileSize(outputPath);
        const processingTime = Date.now() - startTime;
        await logger.logOptimization(cssFile, originalSize, optimizedSize, processingTime);
        optimizedCssFiles.push(`css/${cssFile}`);
      }
    }
    const jsFiles = await fileManager.getFileList(fileManager.targetFolder, '.js');
    const optimizedJsFiles = [];
    for (const jsFile of jsFiles) {
      const startTime = Date.now();
      const jsPath = path.join(fileManager.targetFolder, jsFile);
      const jsContent = await fileManager.readFile(jsPath);
      if (jsContent) {
        const originalSize = await fileManager.getFileSize(jsPath);
        const optimizedJS = await optimizer.optimizeJS(jsContent, jsFile);
        if (optimizedJS.startsWith('SPLIT_REQUIRED:')) {
          const splitResult = await optimizer.splitJavaScript(jsContent, jsFile);
          const splitFiles = splitResult.split('
          for (const splitFile of splitFiles) {
            const lines = splitFile.split('\n');
            const filename = lines[0].replace(' ===', '');
            const code = lines.slice(1).join('\n');
            const outputPath = path.join(fileManager.outputFolder, 'js', filename);
            await fileManager.writeFile(outputPath, code);
            optimizedJsFiles.push(`js/${filename}`);
          }
        } else {
          const outputPath = path.join(fileManager.outputFolder, 'js', jsFile);
          await fileManager.writeFile(outputPath, optimizedJS);
          optimizedJsFiles.push(`js/${jsFile}`);
        }
        const processingTime = Date.now() - startTime;
        await logger.logOptimization(jsFile, originalSize, 0, processingTime);
      }
    }
    const optimizedHTML = await optimizer.optimizeHTML(htmlContent, optimizedCssFiles, optimizedJsFiles);
    const optimizedHtmlPath = path.join(fileManager.outputFolder, fileManager.viewerFile);
    await fileManager.writeFile(optimizedHtmlPath, optimizedHTML);
    const evaluation = await optimizer.analyzeAndCompare(htmlPath, optimizedHtmlPath);
    await logger.log(`Evaluation result: ${evaluation}`);
    if (evaluation.startsWith('REJECT')) {
      await logger.log('Optimization rejected, removing optimized files');
      await fs.remove(fileManager.outputFolder);
    } else {
      await logger.log('Optimization completed successfully');
    }
  } catch (error) {
    await logger.log(`Error during optimization: ${error.message}`);
    throw error;
  }
}
main().catch(console.error);
