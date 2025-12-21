import { Buffer } from 'node:buffer'
import { createServer } from 'node:http'
import process from 'node:process'
import { initRenderer } from '@md/core/renderer'
import { modifyHtmlContent } from '@md/core/utils'

const port = Number(process.env.PORT ?? 8787)
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES ?? 1024 * 1024)

const renderer = initRenderer({})

interface RenderOptions {
  legend?: string
  citeStatus?: boolean
  countStatus?: boolean
  isMacCodeBlock?: boolean
  isShowLineNumber?: boolean
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

  if (req.method === 'POST' && url.pathname === '/render') {
    try {
      const { markdown, options } = await readJson(req)

      if (typeof markdown !== 'string') {
        sendJson(res, 400, { error: 'markdown must be a string' })
        return
      }

      const renderOptions: RenderOptions = typeof options === 'object' && options
        ? options
        : {}

      renderer.reset(renderOptions)
      const html = modifyHtmlContent(markdown, renderer)

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
})
