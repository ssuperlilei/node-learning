console.log(process.cwd()) // /Users/first

console.log(__dirname) // /Users/first

console.log(process.env) // { ... }

console.log(process.argv) // [ '/usr/local/bin/node', '/Users/first/process.ts' ]

console.log(process.pid) // 12345

console.log(process.platform) // darwin

console.log(process.uptime()) // 0.123

console.log(process.memoryUsage()) // { rss: 123456, heapTotal: 123456, heapUsed: 123456, external: 123456 }
