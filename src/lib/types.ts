export type Role = 'team' | 'client'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: Role
  client_id: string | null
}

export type ClientStatus = 'lead' | 'actief' | 'gepauzeerd' | 'gestopt'

export type Client = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  vat_number: string | null
  address: string | null
  city: string | null
  website: string | null
  instagram: string | null
  tiktok: string | null
  facebook: string | null
  linkedin: string | null
  drive_url: string | null
  status: ClientStatus
  notes: string | null
  created_at: string
}

export type ContractStatus = 'actief' | 'verlengd' | 'gestopt'

export type Contract = {
  id: string
  client_id: string
  package: string
  monthly_amount: number
  start_date: string
  end_date: string
  status: ContractStatus
  notes: string | null
}

export type ProjectStatus = 'gepland' | 'lopend' | 'review' | 'afgerond' | 'on_hold'

export type Project = {
  id: string
  client_id: string | null
  title: string
  description: string | null
  budget: number | null
  deadline: string | null
  owner_id: string | null
  status: ProjectStatus
  created_at: string
}

export type TaskStatus = 'todo' | 'bezig' | 'review' | 'klaar'
export type Priority = 'laag' | 'normaal' | 'hoog'

export type Task = {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  assignee_id: string | null
  due_date: string | null
  position: number
  created_at: string
}

export type QuoteStatus = 'concept' | 'verstuurd' | 'bevestigd' | 'afgewezen'

export type Quote = {
  id: string
  client_id: string | null
  project_id: string | null
  number: string | null
  title: string
  amount: number
  status: QuoteStatus
  issue_date: string
  accepted_date: string | null
  notes: string | null
}

export type ExpenseCategory = 'freelancer' | 'materiaal' | 'software' | 'advertenties' | 'verplaatsing' | 'overig'

export type Expense = {
  id: string
  client_id: string | null
  project_id: string | null
  description: string
  category: ExpenseCategory
  amount: number
  expense_date: string
}

export type ContentStatus = 'idee' | 'script' | 'opname' | 'montage' | 'feedback' | 'goedgekeurd' | 'ingepland' | 'gepost'
export type ContentType = 'post' | 'reel' | 'video' | 'story' | 'carrousel'

export type ContentItem = {
  id: string
  client_id: string
  project_id: string | null
  title: string
  type: ContentType
  platforms: string[]
  status: ContentStatus
  drive_url: string | null
  caption: string | null
  planned_date: string | null
  posted_url: string | null
  assignee_id: string | null
  created_at: string
  updated_at: string
}

export type ContentComment = {
  id: string
  content_item_id: string
  author_id: string | null
  body: string
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}
