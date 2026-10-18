const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const input = path.join(root, 'reports', 'entity-boundary-application.json');
const output = path.join(root, 'reports', 'entity-boundary-application.md');
execFileSync(process.execPath, [path.join(__dirname, 'render-entity-boundary-report.js')], { cwd: root, stdio: 'pipe' });
const source = JSON.parse(fs.readFileSync(input, 'utf8'));
const markdown = fs.readFileSync(output, 'utf8');
const total = Object.values(source.counts).reduce((sum, value) => sum + value, 0);
if (!markdown.includes('# 人物、空間、時間、地點詞分詞修訂報告')) throw new Error('report title missing');
if (!markdown.includes(`| 合計 | ${total} |`)) throw new Error('report total missing');
if (!markdown.includes('entity-boundary-application.json')) throw new Error('source link missing');
console.log(`report test passed: ${source.chapters.length} chapters, ${total} applied, ${source.held.length} held`);
