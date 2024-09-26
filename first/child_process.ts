import { exec, execFile, execSync, spawn } from 'child_process'
import path from 'path'

// console.log(execSync('node -v').toString())

// exec('node -v', (error, stdout, stderr) => {
//   if (error) {
//     console.error(`exec error: ${error}`)
//     return
//   }
//   console.log(`stdout: ${stdout}`)
// })

// const { stdout } = spawn('node', ['-v'])

// stdout.on('data', (data) => {
//   console.log(`stdout: ${data}`)
// })

execFile(path.resolve(process.cwd(), './bat.cmd'), null, (err, stdout) => {
  console.log(stdout.toString())
})
