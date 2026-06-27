# Organization Management Testing

Details on how the organization profile, members, and invite rules are tested.

## Coverage Areas

### 1. Schema Contracts (`packages/types`)
- Validates that email formats, names, and roles are correctly verified.
- Rejects invalid role names.

### 2. Business Rules (`services/api-write`)
- Blocks a user from escalating their own role.
- Prevents downgrading the last active organization owner.
- Allows downgrading an owner if multiple owners are active.

### 3. Component Interactivity (`apps/dashboard`)
- Verifies that form payload mapping is accurate.
- Ensures delete/disable confirmation dialogs function correctly.
