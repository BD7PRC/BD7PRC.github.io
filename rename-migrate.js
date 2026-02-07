#!/usr/bin/env node

/**
 * Batch rename script to migrate old filename format to new format
 * 
 * Old: BY1CJL_2.jpg, BY1CJL_2_B.jpg, BY1CJL_2_6m.jpg
 * New: BY1CJL_#2.jpg, BY1CJL_#2_B.jpg, BY1CJL_#2_6m.jpg
 * 
 * Usage: node rename-migrate.js [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const QSL_DIR = path.join(__dirname, 'qsl')

function parseOldFileName(fileName) {
  const ext = path.extname(fileName)
  let baseName = fileName.slice(0, -ext.length).toLowerCase()
  
  const isBack = baseName.endsWith('_b')
  if (isBack) {
    baseName = baseName.slice(0, -2)
  }
  
  let type = ''
  if (baseName.endsWith('_6m')) {
    type = '_6m'
    baseName = baseName.slice(0, -3)
  } else if (baseName.endsWith('_sat')) {
    type = '_SAT'
    baseName = baseName.slice(0, -4)
  }
  
  // Check for legacy index format (_2, _3, etc.)
  // Only treat 2-5 as card indices, 0,1,6-9 are likely portable operation prefixes
  const indexMatch = baseName.match(/_(\d+)$/)
  if (indexMatch) {
    const index = parseInt(indexMatch[1], 10)
    
    // Small numbers (2-5) are treated as card indices
    // Single digits 0,1,6,7,8,9 are treated as portable operation suffixes
    if (index >= 2 && index <= 5) {
      baseName = baseName.slice(0, -(indexMatch[0].length))
      
      // Reconstruct with new format
      const newBase = baseName.toUpperCase() + `_#${index}` + type + (isBack ? '_B' : '')
      return newBase + ext.toLowerCase()
    }
  }
  
  return null // No migration needed
}

function main() {
  const dryRun = process.argv.includes('--dry-run')
  
  console.log(`Scanning ${QSL_DIR}...`)
  
  if (!fs.existsSync(QSL_DIR)) {
    console.error('Error: qsl directory not found')
    process.exit(1)
  }
  
  const files = fs.readdirSync(QSL_DIR)
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f))
  
  console.log(`Found ${imageFiles.length} image files\n`)
  
  const renames = []
  
  imageFiles.forEach(file => {
    const newName = parseOldFileName(file)
    if (newName && newName !== file) {
      renames.push({ old: file, new: newName })
    }
  })
  
  if (renames.length === 0) {
    console.log('No files need renaming. All files are already in the new format.')
    return
  }
  
  console.log(`Found ${renames.length} files to rename:\n`)
  renames.forEach(({ old, new: newName }) => {
    console.log(`  ${old} → ${newName}`)
  })
  
  if (dryRun) {
    console.log('\n[DRY RUN] No files were actually renamed.')
    console.log('Remove --dry-run to perform the actual renaming.')
    return
  }
  
  console.log('\nPerforming rename operations...')
  
  renames.forEach(({ old, new: newName }) => {
    const oldPath = path.join(QSL_DIR, old)
    const newPath = path.join(QSL_DIR, newName)
    
    try {
      fs.renameSync(oldPath, newPath)
      console.log(`  ✓ ${old} → ${newName}`)
    } catch (err) {
      console.error(`  ✗ Failed to rename ${old}: ${err.message}`)
    }
  })
  
  console.log('\nDone!')
  console.log('\nNext steps:')
  console.log('1. Review the renamed files')
  console.log('2. Commit the changes: git add qsl/ && git commit -m "Migrate to new filename format"')
  console.log('3. Push to GitHub: git push origin main')
}

main()
