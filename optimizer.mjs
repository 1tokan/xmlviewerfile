import Anthropic from '@anthropic-ai/sdk';
import { JSDOM } from 'jsdom';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

class ClaudeOptimizer {
  constructor() {
    this.baseUrl = process.env.SOURCE_URL;
    this.outputDir = process.env.OUTPUT_DIR;
    this.logFile = 'optimization_log.json';
    this.state = this.loadState();
    this.maxTokens = 4096;
  }

  loadState() {
    try {
      return existsSync(this.logFile) ? JSON.parse(readFileSync(this.logFile, 'utf8')) : {
        phase: 'diagnose',
        processed: [],
        issues: [],
        optimizations: [],
        iteration: 0,
        lastRun: null
      };
    } catch { return { phase: 'diagnose', processed: [], issues: [], optimizations: [], iteration: 0 }; }
  }

  saveState() {
    this.state.lastRun = Date.now();
    writeFileSync(this.logFile, JSON.stringify(this.state, null, 2));
  }

  async fetchContent(url) {
    try {
      const response = await fetch(url);
      return response.ok ? await response.text() : null;
    } catch { return null; }
  }

  async analyzeCode(content, filename) {
    const prompt = `以下のコードを分析し、最適化が必要な箇所を特定してください：

ファイル: ${filename}
コード:
\`\`\`
${content.slice(0, 8000)}
\`\`\`

以下のJSON形式で回答してください：
{
  "issues": [
    {
      "type": "performance|readability|maintainability|error_handling",
      "description": "問題の説明",
      "location": "行数または関数名",
      "severity": "high|medium|low",
      "solution": "修正方法"
    }
  ],
  "metrics": {
    "codeSize": "文字数",
    "complexity": "複雑度(1-10)",
    "duplicateCode": "重複コード数"
  }
}`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const result = JSON.parse(response.content[0].text);
      return result;
    } catch (error) {
      console.error('分析エラー:', error);
      return { issues: [], metrics: { codeSize: content.length, complexity: 5, duplicateCode: 0 } };
    }
  }

  async optimizeCode(content, issues, filename) {
    const prompt = `以下のコードを最適化してください：

ファイル: ${filename}
問題点: ${JSON.stringify(issues)}
コード:
\`\`\`
${content.slice(0, 6000)}
\`\`\`

最適化されたコードのみを出力してください。説明は不要です。`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }]
      });
      
      return response.content[0].text.replace(/```[\s\S]*?```/g, (match) => 
        match.replace(/```(?:html|css|javascript|js)?\n?/, '').replace(/\n?```$/, '')
      );
    } catch (error) {
      console.error('最適化エラー:', error);
      return content;
    }
  }

  async diagnosePhase() {
    console.log('🔍 診断フェーズ開始');
    const indexContent = await this.fetchContent(`${this.baseUrl}/index.html`);
    if (!indexContent) throw new Error('index.html取得失敗');

    const dom = new JSDOM(indexContent);
    const doc = dom.window.document;
    
    // CSS/JSファイル抽出
    const cssFiles = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(link => link.href);
    const jsFiles = Array.from(doc.querySelectorAll('script[src]')).map(script => script.src);
    
    const filesToAnalyze = [
      { name: 'index.html', content: indexContent },
      ...await Promise.all(cssFiles.map(async url => ({
        name: url.split('/').pop(),
        content: await this.fetchContent(url.startsWith('http') ? url : `${this.baseUrl}/${url}`)
      }))),
      ...await Promise.all(jsFiles.map(async url => ({
        name: url.split('/').pop(),
        content: await this.fetchContent(url.startsWith('http') ? url : `${this.baseUrl}/${url}`)
      })))
    ];

    for (const file of filesToAnalyze.filter(f => f.content)) {
      if (this.state.processed.includes(file.name)) continue;
      
      console.log(`分析中: ${file.name}`);
      const analysis = await this.analyzeCode(file.content, file.name);
      
      this.state.issues.push({
        file: file.name,
        content: file.content,
        analysis
      });
      
      this.state.processed.push(file.name);
      this.saveState();
    }

    this.state.phase = 'optimize';
    console.log(`✅ 診断完了: ${this.state.issues.length}ファイル分析`);
  }

  async optimizePhase() {
    console.log('⚡ 最適化フェーズ開始');
    
    if (!existsSync(this.outputDir)) mkdirSync(this.outputDir, { recursive: true });
    
    for (const item of this.state.issues) {
      if (this.state.optimizations.some(o => o.file === item.file)) continue;
      
      const highIssues = item.analysis.issues.filter(i => i.severity === 'high');
      if (highIssues.length === 0) continue;
      
      console.log(`最適化中: ${item.file}`);
      const optimized = await this.optimizeCode(item.content, highIssues, item.file);
      
      const outputPath = join(this.outputDir, item.file);
      writeFileSync(outputPath, optimized);
      
      this.state.optimizations.push({
        file: item.file,
        original: item.content.length,
        optimized: optimized.length,
        reduction: Math.round((1 - optimized.length / item.content.length) * 100),
        timestamp: new Date().toISOString()
      });
      
      this.saveState();
    }

    this.state.phase = 'validate';
    console.log(`✅ 最適化完了: ${this.state.optimizations.length}ファイル処理`);
  }

  async validatePhase() {
    console.log('🔍 検証フェーズ開始');
    
    const report = {
      timestamp: new Date().toISOString(),
      totalFiles: this.state.optimizations.length,
      totalReduction: this.state.optimizations.reduce((sum, o) => sum + o.reduction, 0) / this.state.optimizations.length,
      issues: this.state.issues.length,
      optimizations: this.state.optimizations
    };
    
    writeFileSync(join(this.outputDir, 'optimization_report.json'), JSON.stringify(report, null, 2));
    
    console.log(`📊 最適化レポート:`);
    console.log(`- 処理ファイル数: ${report.totalFiles}`);
    console.log(`- 平均削減率: ${report.totalReduction.toFixed(1)}%`);
    console.log(`- 検出問題数: ${report.issues}`);
    
    this.state.phase = 'complete';
    this.state.iteration++;
    this.saveState();
  }

  async run(phase = 'all') {
    try {
      if (phase === 'all' || phase === 'diagnose') {
        if (this.state.phase === 'diagnose') await this.diagnosePhase();
      }
      
      if (phase === 'all' || phase === 'optimize') {
        if (this.state.phase === 'optimize') await this.optimizePhase();
      }
      
      if (phase === 'all' || phase === 'validate') {
        if (this.state.phase === 'validate') await this.validatePhase();
      }
      
      if (this.state.phase === 'complete') {
        console.log('🎉 最適化サイクル完了');
        this.state.phase = 'diagnose';
        this.state.processed = [];
        this.saveState();
      }
    } catch (error) {
      console.error('実行エラー:', error);
      process.exit(1);
    }
  }
}

const optimizer = new ClaudeOptimizer();
await optimizer.run(process.argv[2] || 'all');
