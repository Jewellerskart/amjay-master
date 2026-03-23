import { createServer } from 'http'
import { config } from 'dotenv'
config()
const port = process.env.PORT || 4000
import { app } from './app'
const server = createServer(app)
import { cpus } from 'os'
import cluster from 'cluster'
import { customLog } from './utils/common'
import { initCrons } from './crons/run.crons'
if (cluster.isPrimary) {
  const numCPUs = cpus().length
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }
  if (process.env.CRONS === 'production') {
    initCrons()
  }
  cluster.on('exit', (worker, code, signal) => {
    customLog(`Worker ${worker.process.pid} died`)
  })
} else {
  server.listen(port, () => {
    console.log(`Worker on ${process.pid} listening on port ${port}`)
  })
}
