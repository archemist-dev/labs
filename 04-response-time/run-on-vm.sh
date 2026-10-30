#!/usr/bin/env bash
# Run the response-time lab on two fresh Ubuntu LTS VMs: the server in one region, the client in another.
# Usage, copy the folder to each VM, then inside it:
#   server VM: ./run-on-vm.sh server        (self-signed cert, server on :8443 in the background)
#   client VM: ./run-on-vm.sh client HOST   (HOST = the server's public DNS name; runs everything twice)
# The server's security group must allow TCP 8443 from the client's public IP only.
set -euo pipefail
ROLE="${1:?server or client}"

echo "== machine ($ROLE)"
. /etc/os-release && echo "$PRETTY_NAME"
lscpu | grep -E "Model name|^CPU\(s\)"
free -h | head -2
python3 --version
TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
for k in instance-type placement/availability-zone; do
  echo "$k: $(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" "http://169.254.169.254/latest/meta-data/$k" || echo n/a)"
done

if [ "$ROLE" = server ]; then
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -keyout key.pem -out cert.pem \
    -days 2 -subj "/CN=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-hostname)" 2>/dev/null
  pkill -f "server.py cert.pem" || true
  nohup python3 server.py cert.pem key.pem 8443 > server.log 2>&1 &
  sleep 2 && cat server.log
else
  HOST="${2:?server public DNS name}"
  echo "ping to server:" && ping -c 5 -q "$HOST" | tail -1 || true
  for run in 1 2; do
    echo "== run $run"
    JSON="summary-run$run.json" python3 client.py "$HOST" all
  done
fi
