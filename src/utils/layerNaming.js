// Layer naming convention for Nova AI Studio in-browser PSD editor.
// ---------------------------------------------------------------
// This module is the *single source of truth* for which PSD layer
// names the customer is allowed to edit, what UI label/control to
// render for each, and which names imply a default-locked layer.
//
// Three concerns share this file:
//
//   1. LAYER_ROLES — role catalogue used by the admin "publish to
//      shop" flow and by the customer editor. The key is the layer
//      name the admin types in Photoshop (lower-case); the value
//      describes how to render the form control and the canvas
//      overlay.
//
//   2. detectLayerRole / groupLayersByRole — helpers to resolve a
//      raw PSD layer name into the role record above. Names are
//      matched case-insensitively after trimming whitespace.
//
//   3. lock_* — names that, when present in a PSD, mark the layer
//      as locked-by-default. The customer can never edit them; the
//      admin sees them pre-checked in the lock UI but may still
//      manually unlock if needed.
//
// New roles in this revision:
//   - character_png  — the cut-out character figure (preferred name)
//   - img_png        — generic editable image (preferred name)
//   - avt_png        — the round avatar (unchanged)
//
// We keep the legacy names (nvat_png, image_1) wired as ALIASES so
// existing PSDs don't break when this file is upgraded. Both old
// and new names map to the same role so the customer form and the
// renderer treat them identically.
// ---------------------------------------------------------------

function clean(name) {
  return name ? String(name).trim().toLowerCase() : ''
}

// Role records — shape:
//   { role: string,    canonical role id used in the form
//     label: string,   user-facing label (admin can override per template)
//     type: 'text'|'image',
//     icon: string,    lucide icon name to render
//     shape?: 'circle'|'rect'  for image roles, drives the upload preview
//   }
const ROLE_TEXT_TITLE = { role: 'text_title', label: 'Tiêu đề',        type: 'text', icon: 'Type' }
const ROLE_TEXT_PRICE = { role: 'text_price', label: 'Giá',            type: 'text', icon: 'Type' }
const ROLE_TEXT_NAME  = { role: 'text_name',  label: 'Tên',            type: 'text', icon: 'Type' }
const ROLE_TEXT_1     = { role: 'text_1',     label: 'Nội dung 1',     type: 'text', icon: 'Type' }
const ROLE_TEXT_2     = { role: 'text_2',     label: 'Nội dung 2',     type: 'text', icon: 'Type' }
const ROLE_TEXT_3     = { role: 'text_3',     label: 'Nội dung 3',     type: 'text', icon: 'Type' }
const ROLE_TITLE_LOGO = { role: 'title_logo', label: 'Tiêu đề logo',   type: 'text', icon: 'Type' }
const ROLE_TEXT_LOGO  = { role: 'text_logo',  label: 'Text logo phụ',  type: 'text', icon: 'Type' }

const ROLE_CHARACTER  = { role: 'character_png', label: 'Nhân vật PNG',  type: 'image', icon: 'User',       shape: 'rect'   }
const ROLE_IMG        = { role: 'img_png',       label: 'Ảnh chính',     type: 'image', icon: 'Image',      shape: 'rect'   }
const ROLE_AVATAR     = { role: 'avt_png',       label: 'Avatar (tròn)', type: 'image', icon: 'UserCircle', shape: 'circle' }
const ROLE_LOGO       = { role: 'logo',          label: 'Logo',          type: 'image', icon: 'Star',       shape: 'rect'   }

// The map below uses *lower-case PSD layer names* as keys. Multiple
// keys may point at the same role record — those are aliases. The
// `role` field on the value is the canonical id the rest of the
// codebase uses, so aliases collapse into one form field even if
// the PSD mixes old + new names.
export const LAYER_ROLES = {
  // ── Text ─────────────────────────────────────────────────────
  text_title: ROLE_TEXT_TITLE,
  text_price: ROLE_TEXT_PRICE,
  text_name:  ROLE_TEXT_NAME,
  text_1:     ROLE_TEXT_1,
  text_2:     ROLE_TEXT_2,
  text_3:     ROLE_TEXT_3,
  title_logo: ROLE_TITLE_LOGO,
  text_logo:  ROLE_TEXT_LOGO,

  // ── Image (preferred names) ──────────────────────────────────
  character_png: ROLE_CHARACTER,
  img_png:       ROLE_IMG,
  avt_png:       ROLE_AVATAR,
  logo:          ROLE_LOGO,

  // ── Image (legacy aliases — same role record, no UI dup) ─────
  // nvat_png is the old name for the cut-out character.
  nvat_png:  ROLE_CHARACTER,
  // image_1 / logo_1 are the old "first image / logo" slots.
  image_1:   ROLE_IMG,
  logo_1:    ROLE_LOGO,
}

// Returns the role record for a raw PSD layer name, or null.
export function detectLayerRole(layerName) {
  return LAYER_ROLES[clean(layerName)] || null
}

// Convenience: split a flat list of {name,...} layers into three
// buckets so the form can render text fields above image fields.
export function groupLayersByRole(layers) {
  const result = { text: [], image: [], other: [] }
  for (const layer of layers) {
    const role = detectLayerRole(layer.name)
    if (role) {
      if (role.type === 'text') result.text.push({ ...layer, role })
      else result.image.push({ ...layer, role })
    } else {
      result.other.push(layer)
    }
  }
  return result
}

// ---------------------------------------------------------------
// Lock convention
// ---------------------------------------------------------------
// Layers whose name starts with `lock_` (or is a canonical lock
// name) are locked by default when a PSD is published. The customer
// can never edit them. The admin sees them auto-checked in the
// lock toggle UI; they may unlock manually if they really want to.
//
// Two patterns count as "locked":
//   - explicit `lock_<anything>` prefix
//   - the canonical names listed below
// ---------------------------------------------------------------

export const LOCK_PREFIX = 'lock_'

export const CANONICAL_LOCK_NAMES = [
  'lock_background',  // protects the background plate
  'lock_avt',         // protects the round avatar
  'lock_character',   // protects the new-style character cut-out
  'lock_nvat',        // legacy alias for lock_character
  'lock_img',         // protects the generic editable image
  'lock_image',       // legacy alias for lock_img
  'lock_logo',        // protects the brand logo
  'lock_title',       // protects the headline
  'lock_price',       // protects the price text
  'lock_name',        // protects the name text
]

// True if the layer name implies "locked by default".
export function isLockLayerName(name) {
  const n = clean(name)
  if (!n) return false
  if (n.startsWith(LOCK_PREFIX)) return true
  return CANONICAL_LOCK_NAMES.includes(n)
}

// Given a `lock_*` layer name, return the canonical role id it
// guards. The admin uses this to mirror locks onto the matching
// editable layer (so locking `lock_avt` also disables the `avt_png`
// form field even when both layers exist in the PSD).
//
// Examples:
//   lock_avt        -> 'avt_png'
//   lock_character  -> 'character_png'
//   lock_nvat       -> 'character_png'   (legacy alias collapses)
//   lock_img        -> 'img_png'
//   lock_image      -> 'img_png'         (legacy alias)
//   lock_background -> 'background'      (no editable role; just a hint)
//   lock_foo        -> 'foo'             (generic fall-through)
export function lockTargetRole(name) {
  const n = clean(name)
  if (!isLockLayerName(n)) return null
  switch (n) {
    case 'lock_avt':        return 'avt_png'
    case 'lock_character':
    case 'lock_nvat':       return 'character_png'
    case 'lock_img':
    case 'lock_image':      return 'img_png'
    case 'lock_logo':       return 'logo'
    case 'lock_title':      return 'text_title'
    case 'lock_price':      return 'text_price'
    case 'lock_name':       return 'text_name'
    case 'lock_background': return 'background'
    default:
      if (n.startsWith(LOCK_PREFIX)) return n.slice(LOCK_PREFIX.length)
      return null
  }
}

// Hint strings used by the admin upload UI to remind authors of
// the supported names. Kept as exports so the component code stays
// declarative.
export function editableTextHint() {
  return 'text_title, text_name, text_price, text_1, text_2, text_3'
}
export function editableImageHint() {
  return 'character_png, img_png, avt_png, logo'
}
