#!/bin/bash

# Helper script to create new Supabase migrations
# Usage: ./scripts/create-migration.sh "migration_name"

if [ -z "$1" ]; then
    echo "Usage: $0 \"migration_name\""
    echo "Example: $0 \"add_user_table\""
    exit 1
fi

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Create migration file name
MIGRATION_NAME="${TIMESTAMP}_${1}.sql"
MIGRATION_PATH="supabase/migrations/${MIGRATION_NAME}"

# Create the migration file
cat > "$MIGRATION_PATH" << EOF
-- Migration: $1
-- Created: $(date)

-- Add your SQL here

EOF

echo "✅ Created migration: $MIGRATION_PATH"
echo "📝 Edit the file and then run: supabase db push"
