#!/bin/bash
# Quick fix script for AWS deployment schema issues
# Run this on the AWS host where containers are running

echo "🔧 Applying schema fixes to AWS database..."

# Apply the comprehensive schema update
docker exec -it lms-postgres psql -U lms_user -d lms_slncity \
  -f /docker-entrypoint-initdb.d/update-schema-to-latest.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema update applied successfully!"
    
    echo "🔄 Restarting backend container..."
    docker compose restart backend
    
    echo "⏳ Waiting for backend to be healthy..."
    sleep 5
    
    echo "✅ Deployment fix complete!"
    echo "📝 Please test the following:"
    echo "   1. B2B Client Portal login (client ID 1, password: password123)"
    echo "   2. Visit list loading in all queues"
    echo "   3. Print button visibility"
else
    echo "❌ Schema update failed. Please check the error above."
    exit 1
fi
