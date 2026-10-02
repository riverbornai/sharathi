#!/bin/bash

# ==============================================================================
# Google Cloud Platform Deployment Script
# This script deploys the application to a Google Cloud VM.
# It handles creating a static IP, provisioning the VM, and deploying code.
# Run this script to deploy initially, and re-run it anytime you have changes.
# ==============================================================================

# Configuration Variables
# Every value can be overridden with an environment variable, for example:
#   GCP_PROJECT_ID=my-project GCP_REGION=us-central1 ./deploy_gcp.sh
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-asia-south1}"            # e.g. asia-south1 (Mumbai), asia-southeast1 (Singapore)
ZONE="${GCP_ZONE:-${REGION}-a}"
MACHINE_TYPE="${GCP_MACHINE_TYPE:-e2-micro}"   # Smallest and cheapest instance available
INSTANCE_NAME="${GCP_INSTANCE_NAME:-sharathi}"
IP_NAME="${GCP_IP_NAME:-${INSTANCE_NAME}-ip}"
APP_DIR="${APP_DIR:-sharathi}"                 # Directory on the VM (relative to the SSH user's home)

# Ensure gcloud is configured
if [ -z "$PROJECT_ID" ]; then
    echo "Error: No Google Cloud project configured."
    echo "Please run: gcloud config set project YOUR_PROJECT_ID (or set GCP_PROJECT_ID)"
    exit 1
fi

echo "Starting deployment for project: $PROJECT_ID..."
echo "Target Region: $REGION ($MACHINE_TYPE)"

# 1. Create Static IP (if it doesn't exist)
STATIC_IP=$(gcloud --project "$PROJECT_ID" compute addresses describe $IP_NAME --region $REGION --format="value(address)" 2>/dev/null)
if [ -z "$STATIC_IP" ]; then
    echo "Creating static IP: $IP_NAME..."
    gcloud --project "$PROJECT_ID" compute addresses create $IP_NAME --region $REGION
    STATIC_IP=$(gcloud --project "$PROJECT_ID" compute addresses describe $IP_NAME --region $REGION --format="value(address)")
fi
echo "Static IP Address: $STATIC_IP"

# 2. Create VM Instance (if it doesn't exist)
VM_EXISTS=$(gcloud --project "$PROJECT_ID" compute instances describe $INSTANCE_NAME --zone $ZONE --format="value(name)" 2>/dev/null)
if [ -z "$VM_EXISTS" ]; then
    echo "Creating VM instance: $INSTANCE_NAME ($MACHINE_TYPE)..."
    gcloud --project "$PROJECT_ID" compute instances create $INSTANCE_NAME \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --image-family=debian-11 \
        --image-project=debian-cloud \
        --address=$STATIC_IP \
        --tags=http-server,https-server \
        --metadata startup-script='#!/bin/bash
            # Update and install dependencies
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs nginx

            # Install PM2 globally
            npm install -g pm2

            # Configure Nginx reverse proxy to forward port 80 to 3000
            cat <<EOF > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
            systemctl restart nginx
        '
    
    # Check and create firewall rule if it doesn't exist
    FW_EXISTS=$(gcloud --project "$PROJECT_ID" compute firewall-rules describe allow-http-https --format="value(name)" 2>/dev/null)
    if [ -z "$FW_EXISTS" ]; then
        echo "Creating firewall rules for HTTP/HTTPS..."
        gcloud --project "$PROJECT_ID" compute firewall-rules create allow-http-https \
            --allow tcp:80,tcp:443 \
            --target-tags http-server,https-server
    fi

    echo "Waiting 60 seconds for VM initialization and startup script to complete..."
    sleep 60
fi

# 3. Archive project files
echo "Archiving project files..."
TAR_FILE="deploy.tar.gz"
# Exclude unnecessary files and directories to speed up the transfer
tar -czf $TAR_FILE --exclude="node_modules" --exclude=".git" --exclude="frontend" --exclude="$TAR_FILE" .

# 4. Copy to VM
echo "Copying archive to VM..."
gcloud --project "$PROJECT_ID" compute scp $TAR_FILE $INSTANCE_NAME:~/ --zone=$ZONE

# 5. Deploy on VM
echo "Extracting, building, and restarting application on VM..."
gcloud --project "$PROJECT_ID" compute ssh $INSTANCE_NAME --zone=$ZONE --command="
    # Ensure directory exists
    mkdir -p ~/$APP_DIR
    
    # Extract files
    tar -xzf $TAR_FILE -C ~/$APP_DIR
    cd ~/$APP_DIR
    
    # Install dependencies for backend
    echo 'Installing backend dependencies...'
    cd backend
    npm install
    cd ..
    
    # Restart backend using PM2
    echo 'Restarting backend with PM2...'
    pm2 delete $INSTANCE_NAME 2>/dev/null || true
    PORT=3000 pm2 start backend/src/index.js --name $INSTANCE_NAME
    pm2 save
"

# Clean up local archive
rm $TAR_FILE

echo "======================================================"
echo "Deployment Successful!"
echo "Your application is running at: http://$STATIC_IP"
echo "To view logs, ssh into the VM and run: pm2 logs"
echo "======================================================"
