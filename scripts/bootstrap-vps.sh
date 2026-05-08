#!/bin/bash
# Run as root on a fresh Ubuntu 24.04 VPS (Hetzner CAX11 / ARM64)
# Usage: bash bootstrap-vps.sh
set -euo pipefail

REPO_URL="https://github.com/VanikVardanyan/jobarm-tg.git"

echo "==> Installing Docker"
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Installing nginx & certbot"
apt-get install -y -q nginx certbot python3-certbot-nginx

echo "==> Creating deploy user"
id -u deploy &>/dev/null || useradd -m -s /bin/bash deploy
usermod -aG docker deploy

echo "==> Hardening SSH"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload sshd

echo "==> Configuring UFW"
apt-get install -y -q ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Setting up web roots"
mkdir -p /var/www/jobarm-prod /var/www/jobarm-staging
chown -R deploy:deploy /var/www/jobarm-prod /var/www/jobarm-staging

echo "==> Cloning repo (staging)"
mkdir -p /opt/jobarm-staging
chown deploy:deploy /opt/jobarm-staging
sudo -u deploy git clone "$REPO_URL" /opt/jobarm-staging || true

echo "==> Cloning repo (prod)"
mkdir -p /opt/jobarm-prod
chown deploy:deploy /opt/jobarm-prod
sudo -u deploy git clone "$REPO_URL" /opt/jobarm-prod || true

echo "==> Installing nginx configs"
cp /opt/jobarm-prod/deploy/nginx/*.conf /etc/nginx/sites-available/
for f in api.jobarm.am api-staging.jobarm.am www.jobarm.am staging.jobarm.am; do
  ln -sf /etc/nginx/sites-available/$f.conf /etc/nginx/sites-enabled/$f.conf
done
nginx -t && systemctl reload nginx

echo ""
echo "==> Done! Next steps:"
echo "  1. Add deploy public key to /home/deploy/.ssh/authorized_keys"
echo "  2. Create /opt/jobarm-prod/.env  (copy from .env.prod.example)"
echo "  3. Create /opt/jobarm-staging/.env  (copy from .env.staging.example)"
echo "  4. Issue SSL certs:"
echo "     certbot --nginx -d jobarm.am -d www.jobarm.am -d api.jobarm.am -d staging.jobarm.am -d api-staging.jobarm.am"
echo "  5. Seed prod DB:"
echo "     cd /opt/jobarm-prod && docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm api node -e \"require('./dist/db').db.\$queryRaw\`SELECT 1\`\""
echo "     (or: docker compose ... run --rm api npx prisma db seed)"
