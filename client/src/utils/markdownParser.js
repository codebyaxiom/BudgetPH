/**
 * Clean markdown parser for AI Chat messages with table, list, bold, code block, and badge support.
 */

function convertTableRowsToHtml(rows) {
  if (!rows || rows.length === 0) return '';

  const headerRow = rows[0];
  const isDelimiter = (r) => /^\|(\s*:?-+:?\s*\|)+$/.test(r.trim());
  const bodyRows = rows.slice(1).filter(r => !isDelimiter(r));

  const parseCells = (row) => {
    const trimmed = row.trim();
    if (!trimmed.startsWith('|')) return [];
    return trimmed
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim());
  };

  const headers = parseCells(headerRow);
  if (headers.length === 0) return rows.join('<br />');

  let tableHtml = '<div class="overflow-x-auto my-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 shadow-xs backdrop-blur-sm"><table class="w-full text-xs text-left border-collapse">';
  
  // Table Header
  tableHtml += '<thead class="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800"><tr>';
  headers.forEach(h => {
    tableHtml += `<th class="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">${h}</th>`;
  });
  tableHtml += '</tr></thead>';

  // Table Body
  tableHtml += '<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">';
  bodyRows.forEach((row, idx) => {
    const cells = parseCells(row);
    tableHtml += `<tr class="${idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-800/20' : ''} hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition">`;
    cells.forEach(c => {
      // Style category pills or mood if present
      let cellContent = c;
      if (cellContent.toLowerCase() === 'need') {
        cellContent = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Need</span>';
      } else if (cellContent.toLowerCase() === 'want') {
        cellContent = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">Want</span>';
      }
      tableHtml += `<td class="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-xs font-medium">${cellContent}</td>`;
    });
    tableHtml += '</tr>';
  });
  tableHtml += '</tbody></table></div>';

  return tableHtml;
}

export function parseMarkdown(text) {
  if (!text) return '';

  let html = text;

  // 1. Convert code blocks ```...```
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre class="my-2 p-3 bg-slate-900 text-slate-100 dark:bg-slate-950 rounded-xl text-xs overflow-x-auto font-mono"><code>${code.trim()}</code></pre>`;
  });

  // 2. Parse Markdown Tables
  const lines = html.split('\n');
  const processedLines = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      tableRows.push(line);
    } else {
      if (inTable) {
        processedLines.push(convertTableRowsToHtml(tableRows));
        tableRows = [];
        inTable = false;
      }
      processedLines.push(lines[i]);
    }
  }
  if (inTable) {
    processedLines.push(convertTableRowsToHtml(tableRows));
  }

  html = processedLines.join('\n');

  // 3. Headers
  html = html.replace(/^### (.*$)/gim, '<h4 class="font-bold text-sm text-slate-900 dark:text-slate-50 mt-3 mb-1 font-[\'Plus_Jakarta_Sans\']">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="font-extrabold text-base text-slate-900 dark:text-slate-50 mt-3.5 mb-1.5 font-[\'Plus_Jakarta_Sans\']">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="font-black text-lg text-slate-900 dark:text-slate-50 mt-4 mb-2 font-[\'Plus_Jakarta_Sans\']">$1</h2>');

  // 4. Bullet lists (- item or * item)
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-xs sm:text-sm my-0.5 leading-relaxed text-slate-800 dark:text-slate-200">$1</li>');

  // 5. Bold, Italics, Inline Code
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-900 dark:text-white">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-600 dark:text-slate-300">$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] border border-slate-200 dark:border-slate-700">$1</code>');

  // 6. Convert newlines to <br /> (preserving block element formatting)
  html = html
    .replace(/(<\/table>|<\/div>|<\/pre>|<\/h[1-4]>|<\/li>)\n/gi, '$1')
    .replace(/\n(<\/(table|div|pre|h[1-4]|li)>)/gi, '$1')
    .replace(/\n\n+/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return html;
}
