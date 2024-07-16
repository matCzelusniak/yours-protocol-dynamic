const { exec } = require('child_process');
const dotenv = require('dotenv');
const { cwd } = require('process');
dotenv.config();

// Configuration
const env = process.argv[2];
const bsc_url = process.argv[3];
const image = process.env.CLI_IMAGE;
const path = cwd();

const command = `docker run --name yours_blockchain -d --network yours_network -p 7740:7740 -p 7750:7750 -p 9090:9090 -v ${path}:/usr/app ${image} chr node start --name yours_${env}${bsc_url ? ` -p bsc.urls=${bsc_url}` : ''
  } -p metrics.prometheus.port=9090`;
console.log(`>> Starting with command: ${command}`);

exec(command, (err, stdout, stderr) => {
  if (err) {
    console.error('>> Error:', '\n', err);
    return;
  }

  if (stderr) console.error('>> stdError:', '\n', stderr);
  console.log(
    '>> Container running with:',
    '\n',
    `  ENV: ${env}`,
    '\n',
    `  RESULT: ${stdout}`
  );
});