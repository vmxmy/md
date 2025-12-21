import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { initRenderer } from '@md/core/renderer'
import { modifyHtmlContent } from '@md/core/utils'

const __dirname = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT ?? 8787)
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES ?? 1024 * 1024)

const renderer = initRenderer({})

// CSS 文件路径 (从 apps/render-api/src/ 到 packages/shared/src/configs/theme-css/)
const themeCSSDir = resolve(__dirname, '../../../packages/shared/src/configs/theme-css')

// 缓存 CSS 内容
const cssCache: Record<string, string> = {}

function loadCSS(filename: string): string {
  if (cssCache[filename]) {
    return cssCache[filename]
  }
  try {
    const content = readFileSync(resolve(themeCSSDir, filename), 'utf-8')
    cssCache[filename] = content
    return content
  }
  catch {
    console.warn(`[render-api] Failed to load CSS: ${filename}`)
    return ''
  }
}

// 加载所有主题 CSS
function loadThemeCSS(themeName: string = 'default'): { baseCSS: string, themeCSS: string } {
  const baseCSS = loadCSS('base.css')
  const themeCSS = loadCSS(`${themeName}.css`)
  return { baseCSS, themeCSS }
}

interface RenderOptions {
  legend?: string
  citeStatus?: boolean
  countStatus?: boolean
  isMacCodeBlock?: boolean
  isShowLineNumber?: boolean
}

interface StyleOptions {
  theme?: 'default' | 'grace' | 'simple'
  primaryColor?: string
  fontSize?: string
  fontFamily?: string
  lineHeight?: string
  codeTheme?: string
  wechatCompatible?: boolean
}

interface RequestBody {
  markdown: string
  options?: RenderOptions
  includeStyles?: boolean
  styleOptions?: StyleOptions
}

function generateCSSVariables(styleOptions: StyleOptions): string {
  const {
    primaryColor = '#1a73e8',
    fontSize = '15px',
    fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    lineHeight = '1.75',
  } = styleOptions

  return `
:root {
  --md-primary-color: ${primaryColor};
  --md-font-size: ${fontSize};
  --md-font-family: ${fontFamily};
  --md-line-height: ${lineHeight};
  --foreground: 0 0% 25%;
  --blockquote-background: #f7f7f7;
}
`
}

function wrapWithScope(css: string, scope: string = '.md-container'): string {
  // 简单的作用域包装，跳过 :root 和 @规则
  return css.replace(
    /([^{}@]+)\{([^}]*)\}/g,
    (match, selectors, properties) => {
      const trimmedSelectors = selectors.trim()
      if (trimmedSelectors.startsWith('@') || trimmedSelectors.startsWith(':root')) {
        return match
      }
      const wrappedSelectors = trimmedSelectors
        .split(',')
        .map((selector: string) => {
          const trimmed = selector.trim()
          if (!trimmed)
            return ''
          return `${scope} ${trimmed}`
        })
        .filter(Boolean)
        .join(', ')
      return `${wrappedSelectors} { ${properties} }`
    },
  )
}

function replaceWechatVariables(html: string, styleOptions: StyleOptions): string {
  const {
    primaryColor = '#1a73e8',
    fontSize = '15px',
    fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } = styleOptions

  return html
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/var\(--md-font-size\)/g, fontSize)
    .replace(/var\(--md-font-family\)/g, fontFamily)
    .replace(/var\(--md-line-height\)/g, '1.75')
    .replace(/var\(--blockquote-background\)/g, '#f7f7f7')
    .replace(/var\(--foreground\)/g, '0 0% 25%')
    .replace(/hsl\(var\(--foreground\)\)/g, '#3f3f3f')
    .replace(/hsl\(0 0% 25%\)/g, '#3f3f3f')
    // 移除 :root 声明
    .replace(/:root\s*\{[^}]*\}/g, '')
    // 处理 calc() 中的变量
    .replace(/calc\(15px \* ([\d.]+)\)/g, (_, multiplier) => {
      const base = Number.parseFloat(fontSize)
      return `${base * Number.parseFloat(multiplier)}px`
    })
}

function buildFullHTML(
  content: string,
  styleOptions: StyleOptions,
  includeStyles: boolean,
): string {
  if (!includeStyles) {
    return content
  }

  const { theme = 'default', wechatCompatible = false } = styleOptions
  const { baseCSS, themeCSS } = loadThemeCSS(theme)
  const cssVariables = generateCSSVariables(styleOptions)

  // 合并 CSS
  let fullCSS = `${cssVariables}\n${baseCSS}\n${themeCSS}`

  // 添加容器样式
  fullCSS += `
.md-container {
  max-width: 750px;
  margin: 0 auto;
  padding: 20px;
  font-family: var(--md-font-family);
  font-size: var(--md-font-size);
  line-height: var(--md-line-height);
  color: hsl(var(--foreground));
}
.md-container > section > :first-child {
  margin-top: 0 !important;
}
`

  // 添加代码高亮基础样式
  fullCSS += `
/* Highlight.js 基础样式 */
.hljs { background: #1e1e1e; color: #d4d4d4; }
.hljs-keyword { color: #569cd6; }
.hljs-string { color: #ce9178; }
.hljs-number { color: #b5cea8; }
.hljs-comment { color: #6a9955; }
.hljs-function { color: #dcdcaa; }
.hljs-class { color: #4ec9b0; }
.hljs-variable { color: #9cdcfe; }
.hljs-operator { color: #d4d4d4; }
.hljs-punctuation { color: #d4d4d4; }
.hljs-property { color: #9cdcfe; }
.hljs-attr { color: #9cdcfe; }
.hljs-selector-class { color: #d7ba7d; }
.hljs-selector-id { color: #d7ba7d; }
.hljs-tag { color: #569cd6; }
.hljs-name { color: #569cd6; }
.hljs-attribute { color: #9cdcfe; }
.hljs-built_in { color: #4ec9b0; }
.hljs-type { color: #4ec9b0; }
.hljs-params { color: #9cdcfe; }
.hljs-title { color: #dcdcaa; }
.hljs-title.function_ { color: #dcdcaa; }
.hljs-title.class_ { color: #4ec9b0; }
.hljs-meta { color: #c586c0; }
.hljs-literal { color: #569cd6; }
.hljs-symbol { color: #b5cea8; }
.hljs-regexp { color: #d16969; }
.hljs-deletion { color: #ce9178; background: rgba(206, 145, 120, 0.1); }
.hljs-addition { color: #b5cea8; background: rgba(181, 206, 168, 0.1); }
`

  // 包装 CSS 作用域
  const scopedCSS = wrapWithScope(fullCSS, '.md-container')

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Preview</title>
  <style>
${scopedCSS}
  </style>
</head>
<body>
  <div class="md-container">
    ${content}
  </div>
</body>
</html>`

  // 微信兼容模式：替换所有 CSS 变量为实际值
  if (wechatCompatible) {
    html = replaceWechatVariables(html, styleOptions)
  }

  return html
}

function withCors(headers: Record<string, string> = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  }
}

function sendJson(res: any, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.writeHead(status, withCors({
    'Content-Type': 'application/json; charset=utf-8',
  }))
  res.end(body)
}

function sendHtml(res: any, status: number, html: string) {
  res.writeHead(status, withCors({
    'Content-Type': 'text/html; charset=utf-8',
  }))
  res.end(html)
}

function sendEmpty(res: any, status: number) {
  res.writeHead(status, withCors())
  res.end()
}

async function readJson(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let size = 0
    let body = ''

    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBodyBytes) {
        reject(new Error('Body too large'))
        req.destroy()
        return
      }
      body += chunk.toString('utf8')
    })

    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body))
      }
      catch {
        reject(new Error('Invalid JSON'))
      }
    })

    req.on('error', (err: Error) => {
      reject(err)
    })
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const startTime = Date.now()
  const method = req.method ?? 'GET'
  const path = url.pathname
  let requestBytes = 0
  let responseBytes = 0

  req.on('data', (chunk: Buffer) => {
    requestBytes += chunk.length
  })

  const originalWrite = res.write.bind(res)
  res.write = (chunk: any, encoding?: any, callback?: any) => {
    if (chunk) {
      responseBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk), encoding)
    }
    return originalWrite(chunk, encoding, callback)
  }

  const originalEnd = res.end.bind(res)
  res.end = (chunk?: any, encoding?: any, callback?: any) => {
    if (chunk) {
      responseBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk), encoding)
    }
    return originalEnd(chunk, encoding, callback)
  }

  res.on('finish', () => {
    const duration = Date.now() - startTime
    console.log(
      `[render-api] ${method} ${path} ${res.statusCode} ${duration}ms req=${requestBytes}B res=${responseBytes}B`,
    )
  })

  if (req.method === 'OPTIONS') {
    sendEmpty(res, 204)
    return
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { status: 'ok' })
    return
  }

  // 主题列表端点
  if (req.method === 'GET' && url.pathname === '/themes') {
    sendJson(res, 200, {
      themes: [
        { name: 'default', label: '经典' },
        { name: 'grace', label: '优雅' },
        { name: 'simple', label: '简洁' },
      ],
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/render') {
    try {
      const {
        markdown,
        options,
        includeStyles = false,
        styleOptions = {},
      } = await readJson(req) as RequestBody

      if (typeof markdown !== 'string') {
        sendJson(res, 400, { error: 'markdown must be a string' })
        return
      }

      const renderOptions: RenderOptions = typeof options === 'object' && options
        ? options
        : {}

      renderer.reset(renderOptions)
      const content = modifyHtmlContent(markdown, renderer)

      const html = buildFullHTML(content, styleOptions, includeStyles)

      // 如果请求完整 HTML 且 Accept 头包含 text/html，直接返回 HTML
      const acceptHeader = req.headers.accept || ''
      if (includeStyles && acceptHeader.includes('text/html')) {
        sendHtml(res, 200, html)
        return
      }

      sendJson(res, 200, { html })
      return
    }
    catch (error: any) {
      const message = error?.message === 'Body too large'
        ? 'request body exceeds limit'
        : error?.message === 'Invalid JSON'
          ? 'invalid JSON payload'
          : 'failed to render markdown'

      sendJson(res, 400, { error: message })
      return
    }
  }

  sendJson(res, 404, { error: 'not found' })
})

server.listen(port, () => {
  console.log(`[render-api] listening on http://127.0.0.1:${port}`)
  console.log(`[render-api] endpoints:`)
  console.log(`  GET  /health  - Health check`)
  console.log(`  GET  /themes  - List available themes`)
  console.log(`  POST /render  - Render markdown to HTML`)
})
