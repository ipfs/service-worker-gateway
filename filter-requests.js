/* eslint-disable no-console */
import * as fs from 'fs'
import * as readline from 'readline'
import * as isIPFS from 'is-ipfs'

// Function to filter valid IPFS and IPNS paths
function filterValidPaths (inputFile, outputFile) {
  const readStream = fs.createReadStream(inputFile)
  const writeStream = fs.createWriteStream(outputFile)

  const rl = readline.createInterface({
    input: readStream,
    output: writeStream,
    terminal: false
  })

  rl.on('line', (line) => {
    try {
      // Parse each line as JSON
      const data = JSON.parse(line)
      // Check if the line contains a valid /ipfs or /ipns path
      if (data.ClientRequestURI && isIPFS.path(data.ClientRequestURI)) {
        // If valid, write to the output file
        writeStream.write(JSON.stringify(data) + '\n')
      }
    } catch (error) {
      // Ignore lines that can't be parsed as JSON
    }
  })

  rl.on('close', () => {
    console.log('Filtering complete. Valid paths saved to ' + outputFile)
  })
}

// Replace with your input and output file paths
const inputFile = '/Users/sgtpooki/Downloads/requests-2025-05-07.json'
const outputFile = '/Users/sgtpooki/Downloads/requests-2025-05-07-filtered.json'

filterValidPaths(inputFile, outputFile)
