# AWS Database Migration Guide

## Overview
This guide explains how to apply the location-based access control migration to your AWS RDS PostgreSQL database.

## What Changed
- Added `location_id` column to `users`, `clients`, and `referral_doctors` tables
- Modified backend authentication to include `location_id` in JWT tokens
- Implemented location-based filtering across all endpoints
- Fixed SQL query parameter handling for PostgreSQL

## Prerequisites
- AWS EC2 instance with access to RDS
- PostgreSQL client installed (`psql`)
- Database credentials (host, username, password, database name)
- Backup of current database (RECOMMENDED)

## Migration Steps

### Option 1: Using psql from EC2 Instance (Recommended)

```bash
# 1. SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. Navigate to your application directory (if migration file is deployed)
cd /path/to/your/app

# 3. Create backup (IMPORTANT!)
pg_dump -h your-rds-endpoint.rds.amazonaws.com \
        -U your_db_user \
        -d lms_slncity \
        -F c \
        -f backup_before_location_migration_$(date +%Y%m%d_%H%M%S).dump

# 4. Download migration file from repository (if not already on EC2)
wget https://raw.githubusercontent.com/LMS-SLNCity/LMS-SLNCity-preDev/feature/working_report/migration-location-based-access.sql

# OR use scp to copy from local machine:
# scp -i your-key.pem migration-location-based-access.sql ubuntu@your-ec2-ip:/tmp/

# 5. Run the migration
psql -h your-rds-endpoint.rds.amazonaws.com \
     -U your_db_user \
     -d lms_slncity \
     -f migration-location-based-access.sql

# 6. Verify the migration
psql -h your-rds-endpoint.rds.amazonaws.com \
     -U your_db_user \
     -d lms_slncity \
     -c "SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name IN ('users', 'clients', 'referral_doctors') 
         AND column_name = 'location_id' 
         ORDER BY table_name;"
```

### Option 2: Using DBeaver/pgAdmin (GUI)

```bash
# 1. Download the migration file from your repository:
#    migration-location-based-access.sql

# 2. Open DBeaver/pgAdmin and connect to your AWS RDS instance
#    - Host: your-rds-endpoint.rds.amazonaws.com
#    - Port: 5432
#    - Database: lms_slncity
#    - Username: your_db_user
#    - Password: your_password

# 3. Create a backup first (IMPORTANT!)
#    Tools -> Backup Database -> Save as .backup file

# 4. Open SQL Editor

# 5. Load the migration-location-based-access.sql file

# 6. Execute the SQL

# 7. Verify by running:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('users', 'clients', 'referral_doctors') 
AND column_name = 'location_id' 
ORDER BY table_name;
```

### Option 3: Using AWS RDS Query Editor

```bash
# 1. Go to AWS Console -> RDS -> Query Editor

# 2. Connect to your database:
#    - Database instance: Select your RDS instance
#    - Database name: lms_slncity
#    - Username: your_db_user
#    - Password: your_password

# 3. Copy and paste the contents of migration-location-based-access.sql

# 4. Run the query

# 5. Verify with the SELECT query from the migration file
```

## Post-Migration Steps

### 1. Assign Location IDs to Existing Data

After migration, you need to assign `location_id` to existing users, clients, and referral doctors:

```sql
-- Example: Get your branch IDs first
SELECT id, name FROM branches;

-- Assign location to users (example: branch id = 40 for Alpha)
UPDATE users 
SET location_id = 40 
WHERE username IN ('alpha_admin', 'alpha_reception');

-- Keep SUDO user without location (they see all data)
UPDATE users 
SET location_id = NULL 
WHERE role = 'SUDO';

-- Assign location to B2B clients
UPDATE clients 
SET location_id = 40 
WHERE name LIKE '%Alpha%' AND type = 'REFERRAL_LAB';

-- Assign location to referral doctors
UPDATE referral_doctors 
SET location_id = 40 
WHERE id IN (1, 2, 3); -- Replace with actual IDs
```

### 2. Deploy Updated Backend Code

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to app directory
cd /path/to/your/app

# Pull latest code
git pull origin feature/working_report

# Rebuild and restart containers
docker compose down
docker compose up -d --build

# Check logs
docker compose logs -f backend
```

### 3. Verify Location Scoping Works

```bash
# Test with different user types:

# 1. Login as SUDO user - should see ALL data
curl -X POST http://your-ec2-ip:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"sudo","password":"your_password"}'

# 2. Login as location-specific user - should see only their location
curl -X POST http://your-ec2-ip:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alpha_admin","password":"password"}'

# 3. Login as untagged user - should see NO location data
curl -X POST http://your-ec2-ip:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"untagged_user","password":"password"}'

# Test dashboard endpoint (replace TOKEN with actual JWT)
curl -X GET http://your-ec2-ip:5002/api/dashboard/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Rollback Plan (If Needed)

```sql
-- If something goes wrong, you can remove the columns:
ALTER TABLE users DROP COLUMN IF EXISTS location_id;
ALTER TABLE clients DROP COLUMN IF EXISTS location_id;
ALTER TABLE referral_doctors DROP COLUMN IF EXISTS location_id;

-- Then restore from backup:
pg_restore -h your-rds-endpoint.rds.amazonaws.com \
           -U your_db_user \
           -d lms_slncity \
           -c \
           backup_before_location_migration_YYYYMMDD_HHMMSS.dump
```

## Troubleshooting

### Issue: "column already exists"
**Solution:** The migration is idempotent. This message is normal if you run it multiple times.

### Issue: Backend shows "could not determine data type of parameter $1"
**Solution:** This was fixed in the latest code. Make sure you've pulled and rebuilt:
```bash
git pull origin feature/working_report
docker compose up -d --build backend
```

### Issue: Users can't see any data after migration
**Solution:** Check if they have `location_id` assigned:
```sql
SELECT id, username, role, location_id FROM users;
```
- SUDO should have `location_id = NULL`
- Other users should have valid `location_id` (e.g., 40, 41)
- If NULL and not SUDO, assign them a location

### Issue: RDS connection timeout
**Solution:** Check security group allows EC2 instance IP on port 5432

## Important Notes

1. **SUDO Role**: Keep SUDO users with `location_id = NULL` - they need to see all data
2. **Data Visibility**: 
   - Users with `location_id = 40` see only location 40 data
   - Users with `location_id = NULL` (non-SUDO) see NO data
   - SUDO users (regardless of location_id) see ALL data
3. **Idempotent**: Safe to run migration multiple times
4. **Zero Downtime**: Migration adds nullable columns, no data loss
5. **Cache**: Frontend clears cache on mount, no manual cache clearing needed

## Support
If you encounter issues, check:
1. Backend logs: `docker compose logs backend`
2. Database connection: `psql -h your-rds-endpoint -U user -d lms_slncity -c "SELECT 1"`
3. Migration status: Run the verification query from the migration file
