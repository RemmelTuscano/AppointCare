import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const source = fs.readFileSync(path.join(root, 'src', 'lib', 'privacy-masking.ts'), 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const loadedModule = { exports: {} }
vm.runInNewContext(output, { module: loadedModule, exports: loadedModule.exports })
const { maskEmail, maskPhone } = loadedModule.exports

test('email masking keeps a short local prefix and the domain', () => {
  assert.equal(maskEmail('tuscano@example.com'), 'tus****@example.com')
  assert.equal(maskEmail('x@example.com'), '****@example.com')
  assert.equal(maskEmail(null), '')
})

test('phone masking keeps the first four digits and masks the rest', () => {
  assert.equal(maskPhone('0976123456'), '0976******')
  assert.equal(maskPhone('+63 976 123 4567'), '+63 97* *** ****')
  assert.equal(maskPhone('0976'), '****')
  assert.equal(maskPhone(null), '')
})
