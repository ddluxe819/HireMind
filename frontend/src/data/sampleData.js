export const SAMPLE_JOBS = [
  { id: 1, company: 'Stripe', title: 'Product Designer', location: 'Remote · USA', salary: '$140–180K', tags: ['Fintech', 'Remote', 'Design Systems'], logo: 'S', color: '#635BFF', match: 94, size: '4,000 employees', posted: '2h ago', desc: "Join Stripe's design team to craft the future of financial infrastructure. You'll work on core product flows used by millions of developers.", apply_url: '' },
  { id: 2, company: 'Linear', title: 'Senior UX Designer', location: 'San Francisco, CA', salary: '$160–200K', tags: ['SaaS', 'B2B', 'Startup'], logo: 'L', color: '#5E6AD2', match: 89, size: '80 employees', posted: '5h ago', desc: "Help shape the design of the fastest project management tool. You'll own end-to-end flows and work directly with founders.", apply_url: '' },
  { id: 3, company: 'Vercel', title: 'Design Engineer', location: 'Remote · Global', salary: '$130–165K', tags: ['Dev Tools', 'Remote', 'Frontend'], logo: 'V', color: '#222', match: 86, size: '500 employees', posted: '1d ago', desc: 'Unique hybrid role — design and build interfaces that power the modern web. Deep collaboration between design and engineering.', apply_url: '' },
  { id: 4, company: 'Notion', title: 'Product Designer, Growth', location: 'New York, NY', salary: '$145–175K', tags: ['PLG', 'Productivity', 'Growth'], logo: 'N', color: '#E8612A', match: 81, size: '600 employees', posted: '2d ago', desc: "Drive Notion's next growth phase through design-led experiments and activation flows.", apply_url: '' },
  { id: 5, company: 'Figma', title: 'Staff Product Designer', location: 'San Francisco, CA', salary: '$180–220K', tags: ['Design Tools', 'Platform'], logo: 'F', color: '#1ABCFE', match: 78, size: '1,200 employees', posted: '3d ago', desc: "Lead design for Figma's platform experience — plugins, APIs, and developer tooling.", apply_url: '' },
  { id: 6, company: 'Loom', title: 'Product Designer', location: 'Remote · USA', salary: '$130–155K', tags: ['Video', 'Async', 'Remote'], logo: 'L', color: '#625DF5', match: 75, size: '300 employees', posted: '4d ago', desc: 'Shape how millions communicate async. Own the core recording + sharing experience.', apply_url: '' },
]

export const STATUS_META = {
  queued:       { label: 'Queued',      color: '#f59e0b', bg: '#fffbeb', dot: '#f59e0b' },
  ready:        { label: 'Ready',       color: '#5047e5', bg: '#f0effb', dot: '#5047e5' },
  opened:       { label: 'Opened',      color: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6' },
  autofilled:   { label: 'Autofilled',  color: '#8b5cf6', bg: '#f5f3ff', dot: '#8b5cf6' },
  user_reviewing: { label: 'Reviewing', color: '#8b5cf6', bg: '#f5f3ff', dot: '#8b5cf6' },
  submitted:    { label: 'Submitted',   color: '#22c55e', bg: '#f0fdf4', dot: '#22c55e' },
  rejected:     { label: 'Rejected',    color: '#94a3b8', bg: '#f8fafc', dot: '#94a3b8' },
  interviewing: { label: 'Interview',   color: '#0ea5a0', bg: '#f0fdfa', dot: '#0ea5a0' },
}

export const PIPELINE = ['queued', 'ready', 'opened', 'autofilled', 'submitted']

export const SAMPLE_APPS = [
  { id: 1, company: 'Stripe',  title: 'Product Designer',         logo: 'S', color: '#635BFF', status: 'ready',        date: 'Today',     match: 94, resumeV: 'v3', hasExt: true,  apply_url: '' },
  { id: 2, company: 'Linear',  title: 'Senior UX Designer',       logo: 'L', color: '#5E6AD2', status: 'submitted',    date: 'Yesterday', match: 89, resumeV: 'v2', hasExt: false, apply_url: '' },
  { id: 3, company: 'Vercel',  title: 'Design Engineer',          logo: 'V', color: '#222',    status: 'interviewing', date: 'Apr 17',    match: 86, resumeV: 'v2', hasExt: false, apply_url: '' },
  { id: 4, company: 'Notion',  title: 'Product Designer, Growth', logo: 'N', color: '#E8612A', status: 'queued',       date: 'Apr 16',    match: 81, resumeV: 'v1', hasExt: true,  apply_url: '' },
  { id: 5, company: 'Figma',   title: 'Staff Product Designer',   logo: 'F', color: '#1ABCFE', status: 'autofilled',   date: 'Apr 15',    match: 78, resumeV: 'v1', hasExt: true,  apply_url: '' },
  { id: 6, company: 'Loom',    title: 'Product Designer',         logo: 'L', color: '#625DF5', status: 'rejected',     date: 'Apr 14',    match: 75, resumeV: 'v1', hasExt: false, apply_url: '' },
]
