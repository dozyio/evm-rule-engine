// import fs from 'fs'
// import path from 'path'
// import { type RuleDefinition } from './types'
//
// /**
//  * Reads the rule definitions from a JSON file.
//  * Returns the raw JSON array, without converting to `BuiltRules`
//  */
// export function readRulesFile (jsonFilePath: string): RuleDefinition[] {
//   const absolutePath = path.resolve(jsonFilePath)
//   const fileData = fs.readFileSync(absolutePath, 'utf8')
//
//   const rawDefinitions = JSON.parse(fileData) as RuleDefinition[]
//   if (!Array.isArray(rawDefinitions)) {
//     throw new Error('Invalid JSON: top-level is not an array.')
//   }
//
//   return rawDefinitions
// }
