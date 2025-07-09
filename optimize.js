const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

class XMLViewerOptimizer {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.state = this.loadState();
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
    this.maxTokens = 4096;
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync('optimization_state.json', 'utf8'));
    } catch (error) {
      return {
        current_step: 'init',
        iteration: 0,
        last_run: '',
        files_processed: [],
        performance_metrics: {}
      };
    }
  }

  saveState() {
    fs.writeFileSync('optimization_state.json', JSON.stringify(this.state, null, 2));
  }

  async callClaude(prompt) {
    try {
      const response = await axios.post(this.baseUrl, {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      return response.data.content[0].text;
    } catch (error) {
      console.error('Claude API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async readSourceFiles() {
    const files = {};
    const sourceFolder = path.join(process.env.TARGET_FOLDER);
    
    try {
      // 基本ファイル読み込み
      const indexPath = path.join(sourceFolder, 'index.html');
      if (fs.existsSync(indexPath)) {
        files.html = fs.readFileSync(indexPath, 'utf8');
      }

      // CSS/JSファイル検索
      const cssFiles = this.findFiles(sourceFolder, '.css');
      const jsFiles = this.findFiles(sourceFolder, '.js');
      
      files.css = {};
      files.js = {};

      for (const cssFile of cssFiles) {
        const relativePath = path.relative(sourceFolder, cssFile);
        files.css[relativePath] = fs.readFileSync(cssFile, 'utf8');
      }

      for (const jsFile of jsFiles) {
        const relativePath = path.relative(sourceFolder, jsFile);
        files.js[relativePath] = fs.readFileSync(jsFile, 'utf8');
      }

      return files;
    } catch (error) {
      console.error('Error reading source files:', error);
      return {};
    }
  }

  findFiles(dir, extension) {
    const files = [];
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        files.push(...this.findFiles(fullPath, extension));
      } else if (item.endsWith(extension)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  async optimizeHTML(htmlContent) {
    const prompt = `
    以下のXMLビューワのHTMLを最適化してください。

    要件:
    1. CALS_ECフォルダ以外も選択可能な設計
    2. 最適化されたCSS/JSファイルを/optimized/から読み込み
    3. 可読性と保守性を保持
    4. エラーハンドリングの強化

    HTML内容:
    ${htmlContent}

    最適化されたHTMLのみを出力してください。
    `;

    return await this.callClaude(prompt);
  }

  async optimizeCSS(cssFiles) {
    const prompt = `
    以下のCSSファイルを最適化してください。

    要件:
    1. 肥大化時は機能単位で分割（例: layout.css, components.css, utilities.css）
    2. 重複するスタイルを統合
    3. 未使用セレクタを削除
    4. 可読性を保持
    5. ファイル名はkebab-case

    CSS内容:
    ${JSON.stringify(cssFiles, null, 2)}

    最適化結果を以下のJSON形式で出力してください:
    {
      "files": {
        "ファイル名": "CSS内容",
        ...
      },
      "optimization_notes": "最適化内容の説明"
    }
    `;

    const response = await this.callClaude(prompt);
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('CSS optimization response parsing error:', error);
      return { files: cssFiles, optimization_notes: 'Failed to parse optimization result' };
    }
  }

  async optimizeJS(jsFiles) {
    const prompt = `
    以下のJavaScriptファイルを最適化してください。

    要件:
    1. 肥大化時は機能単位で分割（例: xmlParser.js, domRenderer.js, fileLoader.js）
    2. 重複コードを削除
    3. 未使用関数を削除
    4. エラーハンドリング強化
    5. XMLエラー対策（未定義タグ、文字化け、DTD不一致）
    6. ファイル名はkebab-case/camelCase
    7. 意味のある名前を使用

    JavaScript内容:
    ${JSON.stringify(jsFiles, null, 2)}

    最適化結果を以下のJSON形式で出力してください:
    {
      "files": {
        "ファイル名": "JavaScript内容",
        ...
      },
      "optimization_notes": "最適化内容の説明"
    }
    `;

    const response = await this.callClaude(prompt);
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('JS optimization response parsing error:', error);
      return { files: jsFiles, optimization_notes: 'Failed to parse optimization result' };
    }
  }

  async performQualityCheck(originalFiles, optimizedFiles) {
    const prompt = `
    XMLビューワの最適化結果を評価してください。

    元のファイル:
    ${JSON.stringify(originalFiles, null, 2)}

    最適化結果:
    ${JSON.stringify(optimizedFiles, null, 2)}

    評価項目:
    1. UI/UX体験
    2. 速度・パフォーマンス
    3. 機能完全性
    4. 可読性・保守性
    5. エラーハンドリング

    以下のJSON形式で評価結果を出力してください:
    {
      "quality_score": 0-100,
      "improvements": ["改善点1", "改善点2"],
      "issues": ["問題点1", "問題点2"],
      "recommendation": "keep" | "rollback" | "improve",
      "metrics": {
        "code_reduction": "コード削減率%",
        "file_count": "ファイル数変化",
        "estimated_performance": "パフォーマンス評価"
      }
    }
    `;

    const response = await this.callClaude(prompt);
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Quality check response parsing error:', error);
      return {
        quality_score: 50,
        recommendation: 'improve',
        metrics: {}
      };
    }
  }

  async run() {
    const startTime = Date.now();
    console.log('Starting XML Viewer optimization...');

    try {
      // 1. ソースファイル読み込み
      const sourceFiles = await this.readSourceFiles();
      if (!sourceFiles.html) {
        throw new Error('index.html not found');
      }

      // 2. HTML最適化
      console.log('Optimizing HTML...');
      const optimizedHTML = await this.optimizeHTML(sourceFiles.html);

      // 3. CSS最適化
      console.log('Optimizing CSS...');
      const optimizedCSS = await this.optimizeCSS(sourceFiles.css);

      // 4. JavaScript最適化
      console.log('Optimizing JavaScript...');
      const optimizedJS = await this.optimizeJS(sourceFiles.js);

      // 5. 品質チェック
      console.log('Performing quality check...');
      const qualityResult = await this.performQualityCheck(
        sourceFiles,
        {
          html: optimizedHTML,
          css: optimizedCSS.files,
          js: optimizedJS.files
        }
      );

      // 6. 結果保存
      if (qualityResult.recommendation === 'keep') {
        await this.saveOptimizedFiles(optimizedHTML, optimizedCSS.files, optimizedJS.files);
        console.log('Optimization completed and saved');
      } else if (qualityResult.recommendation === 'rollback') {
        console.log('Optimization rolled back due to quality issues');
        await this.cleanup();
      } else {
        console.log('Optimization needs improvement, will retry next iteration');
      }

      // 7. ログ記録
      await this.logResults(qualityResult, Date.now() - startTime);

      this.state.iteration++;
      this.state.last_run = new Date().toISOString();
      this.saveState();

    } catch (error) {
      console.error('Optimization failed:', error);
      await this.logError(error);
    }
  }

  async saveOptimizedFiles(html, cssFiles, jsFiles) {
    const outputDir = process.env.OUTPUT_FOLDER;
    await fs.ensureDir(outputDir);

    // HTML保存
    await fs.writeFile(path.join(outputDir, 'index.html'), html);

    // CSS保存
    for (const [filename, content] of Object.entries(cssFiles)) {
      await fs.writeFile(path.join(outputDir, filename), content);
    }

    // JS保存
    for (const [filename, content] of Object.entries(jsFiles)) {
      await fs.writeFile(path.join(outputDir, filename), content);
    }
  }

  async cleanup() {
    const outputDir = process.env.OUTPUT_FOLDER;
    if (fs.existsSync(outputDir)) {
      await fs.remove(outputDir);
    }
  }

  async logResults(qualityResult, processingTime) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      iteration: this.state.iteration,
      processing_time: processingTime,
      quality_score: qualityResult.quality_score,
      recommendation: qualityResult.recommendation,
      metrics: qualityResult.metrics,
      improvements: qualityResult.improvements,
      issues: qualityResult.issues
    };

    await fs.appendFile(
      'logs/optimization_log.json',
      JSON.stringify(logEntry) + '\n'
    );
  }

  async logError(error) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      iteration: this.state.iteration,
      error: error.message,
      stack: error.stack
    };

    await fs.appendFile(
      'logs/error_log.json',
      JSON.stringify(errorEntry) + '\n'
    );
  }
}

// 実行
const optimizer = new XMLViewerOptimizer();
optimizer.run().catch(console.error);
