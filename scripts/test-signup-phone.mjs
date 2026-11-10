import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const source = fs.readFileSync(path.join(root, 'src', 'lib', 'phone.ts'), 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const loadedModule = { exports: {} }
vm.runInNewContext(output, { module: loadedModule, exports: loadedModule.exports })
const { normalizePhilippineMobileNumber } = loadedModule.exports

test('normalizes valid Philippine mobile numbers', () => {
  assert.equal(normalizePhilippineMobileNumber('09171234567'), '+639171234567')
  assert.equal(normalizePhilippineMobileNumber('+639171234567'), '+639171234567')
})

test('rejects invalid prefixes, lengths, and formats', () => {
  for (const phone of [
    '', '0917123456', '091712345678', '+63917123456', '+6391712345678',
    '08171234567', '+638171234567', '639171234567', '09171234abc',
    '02', '+15551234567', '0917 123 4567',
  ]) {
    assert.equal(normalizePhilippineMobileNumber(phone), null, phone)
  }
})
