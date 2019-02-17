#!/usr/bin/env bash

# Check that we are running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root. Run the command 'sudo su' then try again"
   exit 1
fi

# Install Node.js
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
nvm install v10.15.1 || exit 1

# Reroute port 80 to port 3000
echo "" >> /etc/rc.local
echo "iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000" >> /etc/rc.local
echo "exit 0" >> /etc/rc.local
chmod 775 /etc/rc.local

# Copy sources to /opt/ and systemd service files to /etc/systemd/system/
mkdir /opt/yahoo-fantasy-automation/
cp -r app /opt/yahoo-fantasy-automation/
cp yahoo-fantasy-automation.service /etc/systemd/system/

# Install Node.js dependencies
cd /opt/yahoo-fantasy-automation/app
npm install || exit 1

# Setup flicd and flic-logger as systemd services to run when the system boots up
systemctl daemon-reload
systemctl enable yahoo-fantasy-automation.service
systemctl restart yahoo-fantasy-automation.service

echo ""
echo "Installation succeeded"
