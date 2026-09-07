#!/bin/bash
set -e

echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

echo "🚀 Deploying to Docker container 'ocsinventory-server'..."
# The build output is in frontend/dist/floorplan/
# We need to copy the contents of this folder to /usr/share/ocsinventory-reports/ocsreports/extensions/floorplan/

docker cp dist/floorplan/. ocsinventory-server:/usr/share/ocsinventory-reports/ocsreports/extensions/floorplan/

echo "✅ Deployment complete. You can now refresh OCS Inventory in your browser."
