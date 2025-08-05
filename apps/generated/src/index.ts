import { exec } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function componentsFiles(): Promise<string[]> {
  try {
    const dir = join(__dirname, '../schema')
    const dirents = await readdir(dir, { withFileTypes: true })
    return dirents.map((dirent) => dirent.name)
  } catch (error) {
    console.error('Failed to read json-schema directory:', error)
    return []
  }
}

async function generateZodSchema(file: string) {
  const filename = file.replace(/\.yaml$|\.json$|\.tsp$/, '')

  const outputDir = join(__dirname, '../generated/zod', filename)

  const command = `pnpm schema-to-zod schema/${file} -o ${outputDir}.ts`

  try {
    const { stdout } = await execAsync(command)
    console.log(stdout)
  } catch (e) {
    console.log(e)
  }
}

export async function schemaToLibrary() {
  const files = await componentsFiles()
  const tasks: Promise<void>[] = []

  for (const file of files) {
    if (file.endsWith('.yaml') || file.endsWith('.json') || file.endsWith('.tsp')) {
      tasks.push(generateZodSchema(file))
    }
  }
  await Promise.all(tasks)
}

await schemaToLibrary()
