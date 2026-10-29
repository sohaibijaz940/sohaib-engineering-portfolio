#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y docker.io docker-compose-v2 git ca-certificates curl
systemctl enable --now docker
if ! swapon --show | grep -q /swapfile; then
  if [ ! -e /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || printf '/swapfile none swap sw 0 0\n' >> /etc/fstab
fi
mkdir -p /opt/sohaib-portfolio
chown azureuser:azureuser /opt/sohaib-portfolio
docker --version
docker compose version
free -m
