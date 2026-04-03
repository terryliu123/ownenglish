import { ESLint } from 'eslint'

const eslint = new ESLint()

async function main() {
  const results = await eslint.lintFiles('src')
  const formatter = await eslint.loadFormatter('stylish')
  const resultText = formatter.format(results)

  console.log(resultText)

  const errorCount = results.reduce((sum, result) => sum + result.errorCount, 0)
  process.exit(errorCount > 0 ? 1 : 0)
}

main()
