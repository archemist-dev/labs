#!/usr/bin/env bash
# Run the cold-cache lab on a fresh Ubuntu LTS VM (t3.small): both builds, every strategy, twice, and print the machine.
# Usage on the VM: curl -fsSL https://raw.githubusercontent.com/archemist-dev/labs/main/09-cold-cache/run-on-vm.sh | bash
# Or copy the folder to the VM and run ./run-on-vm.sh inside it (uses the local copy, no clone).
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq && sudo apt-get install -y -qq git docker.io python3-venv >/dev/null
sudo systemctl enable --now docker

if [ ! -f cold_cache_test.py ]; then
  rm -rf /tmp/labs && git clone -q https://github.com/archemist-dev/labs.git /tmp/labs
  cd /tmp/labs/09-cold-cache
fi
python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt
sudo docker pull -q "${PG_IMAGE:-postgres:18}" >/dev/null
sudo docker pull -q "${REDIS_IMAGE:-redis:8}" >/dev/null

echo "== machine"
. /etc/os-release && echo "$PRETTY_NAME"
lscpu | grep -E "Model name|^CPU\(s\)"
free -h | head -2
python3 --version
echo "images: $(sudo docker image inspect --format '{{index .RepoDigests 0}}' "${PG_IMAGE:-postgres:18}" "${REDIS_IMAGE:-redis:8}" | tr '\n' ' ')"

for build in orm batched; do
  for run in 1 2; do
    echo "== build $build, run $run"
    sudo -E env "PATH=$PATH" BUILD="$build" OUT="summary-$build-run$run.json" .venv/bin/python cold_cache_test.py all
  done
done
