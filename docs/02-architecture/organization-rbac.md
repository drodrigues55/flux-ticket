# Organization RBAC

Details of the Organization permission matrix and last-owner protection rules.

## Permission Matrix

| Role | Profile | Members | Events | Finance | Publishing |
| ---- | ------- | ------- | ------ | ------- | ---------- |
| **OWNER** | View & Edit | Manage | Manage | View | Manage |
| **ADMIN** | View | Invite & View | Manage | None | Manage |
| **FINANCE** | View | None | None | View | None |
| **EVENT_MANAGER** | View | None | Manage | None | None |
| **STAFF_MANAGER** | View | None | None | None | None |
| **ANALYST** | View | None | View | None | None |

## Security Rules
- **Last Owner Protection**: The system counts active owners. Downgrading or disabling the only active OWNER throws a validation error.
- **Self Escalation Block**: Members cannot change or escalate their own roles.
