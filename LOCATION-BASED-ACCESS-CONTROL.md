# Location-Based Access Control Implementation

## Overview
Staff members assigned to a specific branch/location will now ONLY see data from that branch. SUDO users continue to see all data across all locations.

## What's Implemented

### Database Schema
- **Added `location_id` columns to:**
  - `visits` - all patient visits belong to a specific location
  - `patients` - patients belong to a specific location/branch
  - `visit_tests` - test orders belong to a location
  - `clients` - B2B clients can be assigned to locations
  - Users already had location support from previous migration

### Backend API Filtering
All GET endpoints now automatically filter data based on user's location:

#### Patients Routes (`/api/patients`)
- `GET /api/patients` - Lists only patients from user's assigned location (or central if NULL)
- `GET /api/patients/search/:query` - Searches only within user's location
- `GET /api/patients/:id` - Access restricted to user's location

#### Visits Routes (`/api/visits`)
- `GET /api/visits` - Lists only visits from user's assigned location (or central if NULL)
- Respects both location filtering and B2B client restrictions

#### Test Inquiries (`/api/test-inquiries`)
- `GET /api/test-inquiries` - Already supports location filtering
- Non-SUDO users only see inquiries from their location

### User Management
- Staff can be assigned to a location when **creating** a new user
- Location can be changed anytime from the **User Management** table
- SUDO users show "🔑 All Branches" badge (not restricted to any location)

## How It Works

### For Staff Members (Non-SUDO)
```
1. User logs in with username/password
2. JWT token includes their assigned location_id
3. Every API request includes the token
4. Backend automatically filters results by location_id
5. User only sees data from their assigned branch
```

### For SUDO Users
- No location restriction - they see all data across all locations
- Can oversee all branches
- Can assign staff to locations from User Management

## Access Rules

| User Role | Location Assignment | Data Access |
|-----------|-------------------|-------------|
| **SUDO** | None (🔑 All Branches) | All locations |
| **ADMIN / RECEPTION / LAB / PHLEBOTOMY / APPROVER** | Single location | Only assigned location + central data |
| **Unassigned** | NULL | No location access until assigned |

## Data Isolation

When a staff member is assigned to "Main Lab - SLNCity" (location_id = 1):
- ✅ See only patients from Main Lab
- ✅ See only visits from Main Lab
- ✅ See only inquiries from Main Lab
- ❌ Cannot see data from "Downtown Branch"
- ❌ Cannot see data from other unassigned central records

## Future Enhancements

1. **Multi-Location Access** - Allow staff to have access to multiple locations
2. **Revenue Reporting** - Filter financial reports by location
3. **Audit Logs** - Track location-based access
4. **Location Templates** - Pre-configured location settings
5. **Branch Dashboard** - Location-specific KPIs and metrics

## Testing

To test the implementation:

1. **Create a user** assigned to "Main Lab - SLNCity" (location_id = 1)
2. **Create a patient** and assign to location_id = 1
3. **Create a visit** for that patient
4. **Login as the staff member** assigned to Main Lab
5. **Verify they only see** patients/visits from Main Lab
6. **Login as SUDO** and verify they see all locations

## API Examples

### Get patients (automatically filtered by location)
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5002/api/patients
```

### Filter includes: `(location_id = user.location_id OR location_id IS NULL)`
- Shows data assigned to user's location
- Shows "central" unassigned records (location_id = NULL)
- Hides other locations' data

---
**Status:** ✅ Fully Implemented
**Database:** Migration 006 applied
**Backend:** All routes updated
**Frontend:** User Management component ready
