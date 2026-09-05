// Hand-maintained mirror of supabase/migrations. Once the project is linked
// you can regenerate with:
//   npx supabase gen types typescript --linked > src/lib/types.ts

export type GroupRole = 'admin' | 'editor' | 'viewer'
export type InvitationStatus = 'pending' | 'used' | 'revoked'
export type RecipeSource = 'manual' | 'url' | 'instagram' | 'facebook' | 'tiktok' | 'text'

export type Ingredient = {
  quantity: string | null
  unit: string | null
  item: string
  note?: string | null
}

export type Profile = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
}

export type Group = {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
}

export type GroupMember = {
  group_id: string
  user_id: string
  role: GroupRole
  created_at: string
}

export type Invitation = {
  id: string
  code: string
  created_by: string | null
  used_by: string | null
  status: InvitationStatus
  group_id: string | null
  role: GroupRole
  email: string | null
  note: string | null
  expires_at: string
  used_at: string | null
  created_at: string
}

export type Recipe = {
  id: string
  owner_id: string
  group_id: string | null
  is_private: boolean
  title: string
  description: string | null
  image_url: string | null
  source_url: string | null
  source_type: RecipeSource
  source_name: string | null
  servings: string | null
  prep_minutes: number | null
  cook_minutes: number | null
  ingredients: Ingredient[]
  instructions: string[]
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export type Menu = {
  id: string
  created_by: string
  group_id: string | null
  is_private: boolean
  title: string
  event_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type MenuItem = {
  id: string
  menu_id: string
  category: string
  title: string
  notes: string | null
  assigned_to: string | null
  assigned_name: string | null
  recipe_id: string | null
  position: number
  is_done: boolean
  created_at: string
}

/** What the extraction endpoint hands the review screen. */
export type ExtractedRecipe = {
  title: string
  description: string | null
  image_url: string | null
  source_url: string | null
  source_type: RecipeSource
  source_name: string | null
  servings: string | null
  prep_minutes: number | null
  cook_minutes: number | null
  ingredients: Ingredient[]
  instructions: string[]
  tags: string[]
}

/** How the extraction was obtained, so the review screen can set expectations. */
export type ExtractionMethod = 'json-ld' | 'microdata' | 'opengraph' | 'llm' | 'empty'

export type ExtractionResult = {
  recipe: ExtractedRecipe
  method: ExtractionMethod
  /** Human-readable note shown above the review form, e.g. why fields are thin. */
  warning: string | null
}
