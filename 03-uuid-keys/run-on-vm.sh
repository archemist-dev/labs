#!/usr/bin/env bash
# Run the UUID key lab on a fresh Ubuntu LTS VM: all variants with the child table, twice, and print the machine.
# Usage on the VM: curl -fsSL https://raw.githubusercontent.com/archemist-dev/labs/main/03-uuid-keys/run-on-vm.sh | bash
# Or copy the folder to the VM and run ./run-on-vm.sh inside it (uses the local copy, no clone).
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq && sudo apt-get install -y -qq git docker.io >/dev/null
sudo systemctl enable --now docker

if [ ! -f uuid_test.py ]; then
  rm -rf /tmp/labs && git clone -q https://github.com/archemist-dev/labs.git /tmp/labs
  cd /tmp/labs/03-uuid-keys
fi
sudo docker pull -q "${PG_IMAGE:-postgres:18}" >/dev/null

echo "== machine"
. /etc/os-release && echo "$PRETTY_NAME"
lscpu | grep -E "Model name|^CPU\(s\)"
free -h | head -2
python3 --version
echo "image: $(sudo docker image inspect --format '{{index .RepoDigests 0}}' "${PG_IMAGE:-postgres:18}")"

for run in 1 2; do
  echo "== run $run"
  sudo -E python3 uuid_test.py all children
done
