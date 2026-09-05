# Lock & Key Management — Schema Documentation

## Introduction: How the Schemas Fit Together

Before diving into `LockKeyRecord` in detail, here's a quick introduction to **every model in the system** and what it's for, since `LockKeyRecord` references several of them.

| Schema | What it represents | Who creates it |
|---|---|---|
| **`User`** | An account holder who logs into the app — either an `admin`, `subadmin`, or `staff` member. This is the authentication/identity model. | Sign-up/registration |
| **`Staff`** | An extended **profile** for a `User` — name, department, designation, contact info, and admin-verification status. One `Staff` profile belongs to exactly one `User`. | Created after a `User` registers, during profile setup |
| **`LockKeyRecord`** | The core record: one lock-and-key handover event, with photos, key count, GPS location, and who received the key(s). | An admin/staff logging a handover |
| **`SavedLocation`** | A reusable, named location (e.g. "Main Gate") that a user has saved, so they don't have to re-enter GPS coordinates every time. | Automatically or manually when a location is used |
| **`Webhook`** | An outbound HTTP endpoint that the system notifies when certain events happen (e.g. a record is created). | Admin configuring integrations |
| **`WebhookLog`** | A log of every attempt to deliver a `Webhook` notification — whether it succeeded, failed, and why. | Automatically, by the system |

**How they connect:**

```
User ──1:1──> Staff
User ──1:N──> LockKeyRecord   (ownerId)
User ──1:N──> SavedLocation   (createdBy)
User ──1:N──> Webhook         (createdBy)
User ──1:N──> Staff           (linkedAdmin — a staff member's approving admin)

LockKeyRecord ──embeds──> handoverPersons[] ──optionally links to──> Staff (personId)

Webhook ──1:N──> WebhookLog   (webhookId)
```

In short: **`User` is the root identity**, `Staff` extends it with a profile, and `LockKeyRecord` is the actual business data — everything else (`SavedLocation`, `Webhook`, `WebhookLog`) supports convenience features or integrations around it.

---

## 1. `User` Schema

The base identity/authentication model. Every person who logs in — admin, subadmin, or staff — has a `User` document.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | auto | Primary key. |
| `name` | `String` | Yes | — | The user's display name. |
| `email` | `String` | Yes | — | Login email. `unique: true` means no two users can share an email; also lowercased and trimmed automatically. |
| `passwordHash` | `String` | Yes | — | The **hashed** password (never the plain-text password) — checked via the `comparePassword()` method using `bcrypt`. |
| `role` | `String` (enum) | No | `"staff"` | One of `"admin"`, `"staff"`, or `"subadmin"` — determines what the user is allowed to do in the app. |
| `adminCode` | `String` | No | `null` | An optional 4-digit code (validated as exactly 4 digits) that an admin sets. Staff members submit this code to get "verified" and linked to that admin (see `Staff.adminCodeVerified` below). Stored as plain text, not hashed. |
| `createdAt` / `updatedAt` | `Date` | auto | auto | Standard timestamps. |

---

## 2. `Staff` Schema

An extended profile attached to a `User`. Think of `User` as the login credentials, and `Staff` as "everything else about this person" — their job details and admin-verification state.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | auto | Primary key. |
| `user` | `ObjectId` (ref: `User`) | Yes | — | Which `User` this profile belongs to. `unique: true` enforces **one Staff profile per User account**. |
| `name` | `String` | Yes | — | Staff member's name (may duplicate `User.name`, kept separately for profile edits). |
| `email` | `String` | Yes | — | Staff member's email (lowercased). |
| `photo` | `photoSubSchema` | No | — | Profile photo. See [Photo Sub-Schema](#photo-sub-schema-photosubschema). |
| `passwordHash` | `String` | No | — | Present in this schema too, though password auth is normally handled via `User`. |
| `phone` | `String` | No | — | Contact phone number. |
| `department` | `String` | No | — | Which department the staff member belongs to. |
| `designation` | `String` | No | — | Job title/designation. |
| `roleTitle` | `String` | No | — | An additional free-text role label (distinct from `User.role`, which controls permissions). |
| `address` | `String` | No | — | Physical address. |
| `adminCodeVerified` | `Boolean` | No | `false` | Whether this staff member has successfully submitted a valid admin's 4-digit code. Staff must be verified this way to appear on that admin's dashboard. |
| `verifiedAdminCode` | `String` | No | `null` | Stores the actual admin code that was verified — used for record-keeping/lookup of which code they entered. |
| `linkedAdmin` | `ObjectId` (ref: `User`) | No | `null` | Which admin `User` this staff member is linked to, once their `adminCode` submission succeeds. |
| `profileCompleted` | `Boolean` | No | `false` | A completion gate — used to decide whether to redirect the user to finish their profile setup. |
| `completedAt` | `Date` | No | `null` | Timestamp of when the profile was marked complete. |
| `createdAt` / `updatedAt` | `Date` | auto | auto | Standard timestamps. |

**Index:** `{ email: 1 }` — speeds up looking up a staff profile by email.

---

## 3. `LockKeyRecord` Schema (Core Record)

The central document type. Each `LockKeyRecord` represents **one lock-and-key handover event**, capturing photo evidence of the lock, key(s), placement, and recipient(s).

**Collection name:** `lockkeyrecords`

### Top-Level Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | auto | Primary key. |
| `lockPhoto` | `photoSubSchema` | No | — | Photo evidence of **the lock itself**. |
| `keyPhoto` | `photoSubSchema` | No | — | Photo evidence of **the key(s)** being handed over. |
| `keyCount` | `Number` | No | `1` | Total number of physical keys in this handover. Must be at least `1`. |
| `placementPhoto` | `photoSubSchema` | No | — | Photo showing **where the lock is physically installed** (e.g. a door or gate). |
| `handoverPersons` | Array of sub-documents | No | `[]` | Every person who received a key as part of this record — can be more than one. See [Handover Person Sub-Schema](#handover-person-sub-schema). |
| `location.lat` / `location.lng` | `Number` | No | — | GPS coordinates of the handover/placement, for map display. |
| `status` | `String` (enum) | No | `"active"` | Overall lifecycle state of the record. See [Status Values](#status-values-shared-enum). |
| `ownerId` | `ObjectId` (ref: `User`) | No | — | The `User` who owns/created this record — used to isolate each user's own data. |
| `isDeleted` | `Boolean` | No | `false` | **Soft-delete flag** — marks a record as removed without physically deleting it, preserving history. |
| `createdAt` / `updatedAt` | `Date` | auto | auto | Standard timestamps. |
| `createdBy` *(virtual)* | `ObjectId` | — | — | **Not stored in the database.** A backward-compatible alias for `ownerId`. See [Virtuals](#virtuals). |

### Photo Sub-Schema (`photoSubSchema`)

A small, reusable embedded schema (`{ _id: false }` — it never exists as its own document, only nested inside a parent). Reused for `lockPhoto`, `keyPhoto`, `placementPhoto`, `Staff.photo`, `SavedLocation.photo`, and each handover person's `photo`.

| Field | Type | Default | Description |
|---|---|---|---|
| `url` | `String` | — | The URL/path where the uploaded photo can be viewed. |
| `fileId` | `String` | — | Internal identifier for the stored file, used to delete/locate it separately from its URL. |
| `uploadedAt` | `Date` | `Date.now` | When the photo was uploaded. |

### Handover Person Sub-Schema

An array of embedded sub-documents inside `handoverPersons`. Unlike `photoSubSchema`, each entry **does** get its own auto-generated `_id`, so individual handover entries can be referenced/updated.

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | `String` | — | Name of the person receiving the key. |
| `role` | `String` | — | Their role/title *at the time of handover* (stored as free text, independent of their `Staff` record). |
| `contactNumber` | `String` | — | Phone number, kept as text to preserve formatting (e.g. leading `+` or `0`). |
| `personId` | `ObjectId` (ref: `Staff`) | — | Optional link to a registered `Staff` document, if the recipient is an existing staff member. |
| `photo` | `photoSubSchema` | — | Photo of the person receiving the key (e.g. identity verification). |
| `status` | `String` (enum) | `"active"` | Status of **this specific handover**, independent of the parent record's status. |
| `keysGiven` | `Number` | `1` | How many of the total keys this specific person received — relevant when `keyCount` is split across multiple recipients. |

### Status Values (shared enum)

Used by both the record-level `status` and each handover person's `status`:

| Value | Meaning |
|---|---|
| `active` | Currently in use / ongoing handover. |
| `inactive` | No longer active, but not formally returned or lost. |
| `returned` | Key physically returned to the owner/admin. |
| `lost` | Key reported lost or missing. |

### Indexes

1. **`{ isDeleted: 1, status: 1, createdAt: -1 }`** — speeds up the main listing view: non-deleted records, filtered by status, newest first.
2. **`{ ownerId: 1, isDeleted: 1, createdAt: -1 }`** — same pattern, scoped to one user, for per-user data isolation.
3. **`{ "handoverPersons.name": 1 }`** — fast lookup/search by a handover person's name within the nested array.

### Virtuals

- **`createdBy`** — a getter/setter pair around `ownerId`, kept purely for **backward compatibility** with older code that expects a `createdBy` field. Reading it returns `ownerId` (or a legacy raw value if present); writing it sets `ownerId`.
- **`toJSON`/`toObject` virtuals enabled** — ensures `createdBy` actually appears in API responses, since Mongoose hides virtuals by default.

### Design Notes

- **All photo fields are optional**, suggesting records can be filled in progressively rather than all at once.
- **Soft delete over hard delete** preserves audit history for accountability.
- **Denormalized handover data** — `name`, `role`, `contactNumber`, and `photo` are stored directly on each handover entry (not just a `personId` reference), preserving a historical snapshot even if that person's `Staff` profile later changes.

---

## 4. `SavedLocation` Schema

A convenience model letting a user save a named/reusable location instead of re-entering GPS coordinates for every handover.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | auto | Primary key. |
| `label` | `String` | No | — | A friendly name for the location, e.g. `"Main Gate"` or `"Warehouse A"`. |
| `lat` / `lng` | `Number` | No | — | GPS coordinates of the saved location. |
| `description` | `String` | No | — | Optional free-text notes about the location. |
| `photo` | `photoSubSchema` | No | — | Optional photo of the location. |
| `createdBy` | `ObjectId` (ref: `User`) | **Yes** | — | Which user saved this location. Note: unlike `LockKeyRecord.ownerId`, this is required and has no `createdBy`-virtual naming inconsistency. |
| `usageCount` | `Number` | No | `1` | How many times this saved location has been reused — likely incremented each time it's selected instead of manually entering coordinates. |
| `lastUsedAt` | `Date` | No | `Date.now` | When the location was last used. |
| `createdAt` / `updatedAt` | `Date` | auto | auto | Standard timestamps. |

**Indexes:**
- `{ createdBy: 1, updatedAt: -1 }` — a user's own saved locations, most recently updated first.
- `{ label: "text" }` — enables **text search** on the label (e.g. searching "gate" matches "Main Gate").
- `{ lat: 1, lng: 1 }` — speeds up coordinate-based lookups (e.g. finding a saved location near given coordinates).

---

## 5. `Webhook` Schema

Lets the system notify an external URL whenever certain events occur (e.g. a third-party integration wants to know when a record is created).

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | auto | Primary key. |
| `targetUrl` | `String` | Yes | — | The external URL to notify. Validated with a regex to ensure it starts with `http://` or `https://`. |
| `event` | `String` (enum) | Yes | `"*"` | Which event triggers this webhook — one of `record.created`, `record.updated`, `record.deleted`, `record.status_changed`, `staff.created`, `staff.updated`, or `"*"` (all events). |
| `secret` | `String` | Yes | — | A secret token used to sign/verify webhook payloads. `select: false` means it's **hidden by default** from normal queries — must be explicitly requested. |
| `isActive` | `Boolean` | No | `true` | Whether this webhook is currently enabled. |
| `description` | `String` | No | `""` | Free-text notes about what this webhook is for. |
| `createdBy` | `ObjectId` (ref: `User`) | No | — | Which admin configured this webhook. |
| `createdAt` / `updatedAt` | `Date` | auto | auto | Standard timestamps. |

**Method — `toSafeJSON()`:** Converts the document to a plain object but replaces the sensitive `secret` field with a masked preview (e.g. `****abcd`, showing only the last 4 characters) — so it can be safely displayed in a UI without exposing the full secret.

**Indexes:**
- `{ event: 1, isActive: 1 }` — quickly find all active webhooks subscribed to a given event, when the system needs to fire notifications.
- `{ targetUrl: 1, event: 1 }` **(unique)** — prevents registering the exact same URL for the exact same event twice.

---

## 6. `WebhookLog` Schema

An audit trail of every attempt to deliver a webhook notification, including retries.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | auto | Primary key. |
| `webhookId` | `ObjectId` (ref: `Webhook`) | Yes | — | Which `Webhook` this delivery attempt belongs to. |
| `event` | `String` | Yes | — | The specific event that triggered this delivery (e.g. `"record.created"`), even if the webhook itself is subscribed to `"*"`. |
| `payload` | `Mixed` | No | — | The actual data sent in the webhook request. `Mixed` type means it can be any shape of JSON. |
| `status` | `String` (enum) | No | `"pending"` | Delivery status — `"pending"`, `"success"`, or `"failed"`. |
| `attempts` | `Number` | No | `0` | How many times delivery has been attempted (for retry logic). |
| `responseCode` | `Number` | No | `null` | The HTTP status code returned by the target URL, if any. |
| `responseBody` | `String` | No | `null` | The raw response body from the target URL. |
| `error` | `String` | No | `null` | Error message if the delivery failed (e.g. connection timeout). |
| `lastAttemptAt` | `Date` | No | `null` | Timestamp of the most recent delivery attempt. |
| `nextRetryAt` | `Date` | No | `null` | When the next retry is scheduled, for failed deliveries. |
| `createdAt` / `updatedAt` | `Date` | auto | auto | Standard timestamps. |

**Indexes:**
- `{ status: 1, attempts: 1, nextRetryAt: 1 }` — used by a background job to find failed/pending deliveries that are due for a retry.
- `{ createdAt: -1 }` — for viewing the most recent log entries first.

---

## Full Relationship Summary

| Field | From | To | Type |
|---|---|---|---|
| `Staff.user` | `Staff` | `User` | 1-to-1 |
| `Staff.linkedAdmin` | `Staff` | `User` | many-to-1 |
| `LockKeyRecord.ownerId` | `LockKeyRecord` | `User` | many-to-1 |
| `LockKeyRecord.handoverPersons[].personId` | `LockKeyRecord` (embedded) | `Staff` | many-to-1 |
| `SavedLocation.createdBy` | `SavedLocation` | `User` | many-to-1 |
| `Webhook.createdBy` | `Webhook` | `User` | many-to-1 |
| `WebhookLog.webhookId` | `WebhookLog` | `Webhook` | many-to-1 |
