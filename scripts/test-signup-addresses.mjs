import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const source = fs.readFileSync(path.join(root, 'src', 'lib', 'signup-addresses.ts'), 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const loadedModule = { exports: {} }
vm.runInNewContext(output, { module: loadedModule, exports: loadedModule.exports })
const addresses = Array.from(loadedModule.exports.SIGNUP_ADDRESS_SUGGESTIONS)

test('signup suggestions cover the supplied municipalities without duplicate addresses', () => {
  assert.equal(addresses.length, 49)
  assert.equal(new Set(addresses).size, addresses.length)
  for (const [municipality, count] of [['Abra de Ilog', 10], ['Mamburao', 15], ['Paluan', 12], ['Santa Cruz', 11]]) {
    assert.equal(addresses.filter((address) => address.endsWith(`, ${municipality}, Occidental Mindoro`)).length, count)
  }
  assert.ok(addresses.includes('Santa Cruz, Occidental Mindoro'))
  assert.ok(addresses.includes('Poblacion, Abra de Ilog, Occidental Mindoro'))
  assert.ok(addresses.includes('Poblacion 1, Mamburao, Occidental Mindoro'))
  assert.ok(addresses.includes("Silahis ng Pag-asa Poblacion, Paluan, Occidental Mindoro"))
  assert.ok(addresses.includes('Poblacion I, Santa Cruz, Occidental Mindoro'))
})
