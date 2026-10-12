#!/usr/bin/env bash
# Run a lab's test on a fresh Ubuntu 24.04 VM, twice per input, and print the machine it ran on.
# Usage on the VM: curl -fsSL https://raw.githubusercontent.com/archemist-dev/labs/main/run-on-vm.sh | bash -s 01-payload-encoding
set -euo pipefail
LAB="${1:-01-payload-encoding}"

export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq && sudo apt-get install -y -qq git python3-venv >/dev/null

rm -rf /tmp/labs && git clone -q https://github.com/archemist-dev/labs.git /tmp/labs
cd "/tmp/labs/$LAB"
python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt

echo "== machine"
lscpu | grep -E "Model name|^CPU\(s\)"
free -h | head -2
python3 --version

for size in typical typical big big; do
  echo "== $size"
  .venv/bin/python encoding_test.py "$size"
done
