import os from 'os';

console.log(os.type()); // Windows_NT

console.log(os.platform()); // win32

console.log(os.arch()); // x64

console.log(os.release()); // 10.0.19041

console.log(os.uptime()); // 1166.0

console.log(os.hostname()); // DESKTOP-123456

console.log(os.homedir()); // C:\Users\username

console.log(os.tmpdir()); // C:\Users\username\AppData\Local\Temp

console.log(os.cpus()); // [{ model: 'Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz', speed: 2592, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }, ...]