const execa = require('execa')

async function runCommand() {
  try {
    const { stdout } = await execa('ls', ['-l', '-a'], { cwd: '../' })
    console.log('命令执行结果：', stdout)
  } catch (error) {
    console.error('命令执行失败：', error)
  }
}

runCommand()
