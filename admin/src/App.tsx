import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, BarChart3, Check, ChevronDown, Clock3, Disc3,
  Download, FileAudio, FileText, Headphones, LayoutDashboard, ListFilter, LoaderCircle, LogOut,
  Menu, Music2, Search, Shield, ShieldAlert,
  ShieldCheck, SlidersHorizontal, Upload, Users, X,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { getIdTokenResult } from 'firebase/auth';
import { auth, bootstrapAdminUid, isFirebaseConfigured } from './firebase';
import {
  bootstrapAdmin, getCollectionCount, setAdminRole, setUserStatus, updateContent, uploadContentAsset,
  watchAnalytics, watchAuditLogs, watchCatalog, watchLiveMetrics, watchMostPlayed, watchUsers,
} from './data';
import type {
  AdminRole, AnalyticsDocument, AuditLogDocument, Claims, ContentStatus, PageId, Severity,
  CatalogCollection, TrackDocument, UserDocument, UserStatus,
} from './types';
import { roleLabel } from './types';

const pageMeta: Record<PageId, { title: string; caption: string }> = {
  overview: { title: 'Overview', caption: 'Your platform, at a glance.' },
  users: { title: 'User management', caption: 'Manage accounts and administrator access.' },
  moderation: { title: 'Content moderation', caption: 'Review releases and manage regional restrictions.' },
  analytics: { title: 'Analytics', caption: 'Understand what listeners are playing.' },
  logs: { title: 'System activity', caption: 'A real-time record of administrative actions.' },
};

const roleChoices: AdminRole[] = ['user', 'moderator', 'analytics_manager', 'auditor', 'super_admin'];
const statusChoices: ContentStatus[] = ['published', 'under_review', 'restricted', 'taken_down'];
const chartColors = ['#1ed760', '#6ee7a4', '#98a0a5', '#eab308', '#f87171'];
const dayLabels = (seconds?: number) =>
  seconds ? new Date(seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';

function isAllowed(page: PageId, claims: Claims) {
  if (page === 'overview') return Boolean(claims.admin || claims.moderator || claims.analytics_manager || claims.auditor);
  if (page === 'users') return Boolean(claims.admin || claims.moderator);
  if (page === 'moderation') return Boolean(claims.admin || claims.moderator);
  if (page === 'analytics') return Boolean(claims.admin || claims.analytics_manager || claims.auditor);
  return Boolean(claims.admin || claims.auditor);
}

function exportData(rows: object[], filename: string, format: 'csv' | 'json') {
  const content =
    format === 'json'
      ? JSON.stringify(rows, null, 2)
      : rows.length
        ? [Object.keys(rows[0]), ...rows.map((row) => Object.values(row))]
            .map((line) =>
              line
                .map((value) => {
                  const text =
                    value !== null && typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value ?? '');
                  const safe = /^[\t\r=+\-@]/.test(text) ? `'${text}` : text;
                  return `"${safe.replaceAll('"', '""')}"`;
                })
                .join(','),
            )
            .join('\n')
        : '';
  const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Claims>({});
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState<PageId>('overview');
  const [queryText, setQueryText] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    return onIdTokenChanged(auth, async (current) => {
      setUser(current);
      setClaims({});
      if (current) {
        try {
          const token = await getIdTokenResult(current);
          setClaims({
            role: token.claims.role as AdminRole | undefined,
            admin: token.claims.admin === true || token.claims.role === 'super_admin',
            moderator: token.claims.moderator === true || token.claims.role === 'moderator',
            auditor: token.claims.auditor === true || token.claims.role === 'auditor',
            analytics_manager:
              token.claims.analytics_manager === true || token.claims.role === 'analytics_manager',
          });
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Unable to load administrator permissions.');
        }
      }
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function runAction(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      setToast(message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The requested action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!isFirebaseConfigured) return <ConfigurationNotice />;
  if (authLoading) return <FullScreenLoading />;
  if (!user) return <Login onError={setError} />;
  const isAdmin = isAllowed('overview', claims);

  if (!isAdmin) {
    return (
      <AccessDenied
        user={user}
        error={error}
        loading={busy}
        onLogout={() => signOut(auth!)}
        onBootstrap={() =>
          runAction(async () => {
            await bootstrapAdmin();
            await user.getIdToken(true);
            const token = await getIdTokenResult(user);
            setClaims({
              role: token.claims.role as AdminRole | undefined,
              admin: token.claims.admin === true || token.claims.role === 'super_admin',
            });
          }, 'Initial administrator access granted.')
        }
        canBootstrap={Boolean(bootstrapAdminUid && bootstrapAdminUid === user.uid)}
      />
    );
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar page={page} claims={claims} onNavigate={(nextPage) => {
        setPage(nextPage);
        if (window.innerWidth <= 760) setCollapsed(false);
      }} collapsed={collapsed} />
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={() => setCollapsed(!collapsed)}>
            <Menu size={19} />
          </button>
          <div className="breadcrumb"><span>Spotibai</span><span className="crumb-slash">/</span>{pageMeta[page].title}</div>
          <div className="topbar-right">
            <span className="live-indicator"><i /> Live system</span>
            <button className="avatar" aria-label="Sign out" title="Sign out" onClick={() => signOut(auth!)}>{(user.email?.[0] ?? 'A').toUpperCase()}</button>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">OPERATIONS CENTER</div>
              <h1>{pageMeta[page].title}</h1>
              <p>{pageMeta[page].caption}</p>
            </div>
            {(page === 'users' || page === 'moderation' || page === 'logs') && (
              <label className="search-field">
                <Search size={16} />
                <input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Search..." aria-label="Search current view" />
                {queryText && <button aria-label="Clear search" onClick={() => setQueryText('')}><X size={14} /></button>}
              </label>
            )}
          </div>
          {error && <InlineNotice tone="error" message={error} onDismiss={() => setError('')} />}
          <PageContent
            page={page}
            claims={claims}
            search={queryText}
            busy={busy}
            onAction={runAction}
            onError={setError}
            onNavigate={setPage}
          />
        </main>
        {toast && <div className="toast"><Check size={16} />{toast}</div>}
      </div>
    </div>
  );
}

function Sidebar({ page, claims, onNavigate, collapsed }: {
  page: PageId; claims: Claims; onNavigate: (page: PageId) => void; collapsed: boolean;
}) {
  const nav: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users & access', icon: Users },
    { id: 'moderation', label: 'Content', icon: Disc3 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'logs', label: 'Audit trail', icon: FileText },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Music2 size={21} fill="currentColor" /></div>
        <div className="brand-name">spotibai<span>ADMIN</span></div>
      </div>
      <div className="nav-section-label">WORKSPACE</div>
      <nav className="side-nav">
        {nav.filter((item) => isAllowed(item.id, claims)).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onNavigate(id)} className={`nav-link ${page === id ? 'active' : ''}`} title={collapsed ? label : undefined}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{page === id && <span className="nav-active-mark" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-bottom">
        <div className="security-callout">
          <ShieldCheck size={17} />
          <div><strong>Secure console</strong><span>Protected by Firebase</span></div>
        </div>
        <div className="sidebar-footer">SPOTIBAI OPERATIONS <span>v1.0</span></div>
      </div>
    </aside>
  );
}

function PageContent({ page, claims, search, busy, onAction, onError, onNavigate }: {
  page: PageId;
  claims: Claims;
  search: string;
  busy: boolean;
  onAction: (action: () => Promise<unknown>, message: string) => Promise<void>;
  onError: (message: string) => void;
  onNavigate: (page: PageId) => void;
}) {
  if (page === 'users') return <UsersPage search={search} claims={claims} onAction={onAction} busy={busy} />;
  if (page === 'moderation') return <ModerationPage search={search} onAction={onAction} busy={busy} onError={onError} />;
  if (page === 'analytics') return <AnalyticsPage />;
  if (page === 'logs') return <AuditPage search={search} />;
  return <OverviewPage claims={claims} onNavigate={onNavigate} />;
}

function OverviewPage({ claims, onNavigate }: { claims: Claims; onNavigate: (page: PageId) => void }) {
  const [live, setLive] = useState<AnalyticsDocument | null>(null);
  const [daily, setDaily] = useState<AnalyticsDocument[]>([]);
  const [topTracks, setTopTracks] = useState<TrackDocument[]>([]);
  const [totals, setTotals] = useState<{ users: number | null; tracks: number | null }>({ users: null, tracks: null });
  const [error, setError] = useState('');
  useEffect(() => {
    const failed = (reason: Error) => setError(reason.message);
    const unsubs = [
      watchLiveMetrics(setLive, failed),
      watchAnalytics(setDaily, failed),
      watchMostPlayed(setTopTracks, failed),
    ];
    if (isAllowed('users', claims)) {
      getCollectionCount('users').then((users) => setTotals((current) => ({ ...current, users }))).catch(failed);
    }
    getCollectionCount('tracks').then((tracks) => setTotals((current) => ({ ...current, tracks }))).catch(failed);
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const latest = daily[0]?.date === today ? daily[0] : undefined;
  const streams = daily.slice(0, 7).slice().reverse().map((item) => ({
    day: item.date ?? dayLabels(item.timestamp?.seconds),
    streams: item.streams ?? 0,
  }));
  return (
    <>
      {error && <InlineNotice tone="error" message={`Some live data could not be loaded: ${error}`} />}
      <div className="welcome-strip">
        <div className="welcome-symbol"><Activity size={20} /></div>
        <div><strong>Everything is in rhythm.</strong><span>Your platform activity is updating in real time.</span></div>
        <span className="welcome-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </div>
      <section className="metric-grid">
        <MetricCard label="Total users" value={totals.users?.toLocaleString() ?? '—'} icon={Users} detail="Registered accounts" />
        <MetricCard label="Catalog tracks" value={totals.tracks?.toLocaleString() ?? '—'} icon={Disc3} detail="Across your music library" />
        <MetricCard label="Active listeners" value={(live?.activeListeners ?? 0).toLocaleString()} icon={Headphones} detail="Right now" live />
        <MetricCard label="Streams today" value={(latest?.streams ?? 0).toLocaleString()} icon={Activity} detail="Daily total" trend />
      </section>
      <div className="content-grid dashboard-grid">
        <section className="panel chart-panel">
          <PanelHeading title="Listening activity" subtitle="Daily streams · last 7 days" aside={<span className="panel-live"><i /> LIVE</span>} />
          <div className="chart-area">
            {streams.length ? <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={streams} margin={{ top: 16, right: 12, left: -14, bottom: 0 }}>
                <defs><linearGradient id="streamsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1ed760" stopOpacity={0.28} /><stop offset="100%" stopColor="#1ed760" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="#292c29" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#858a85', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#858a85', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#202320', border: '1px solid #343934', borderRadius: 8, color: '#f5f7f5' }} />
                <Area type="monotone" dataKey="streams" stroke="#1ed760" strokeWidth={2.5} fill="url(#streamsGradient)" />
              </AreaChart>
            </ResponsiveContainer> : <EmptyState icon={BarChart3} title="No stream data yet" text="Daily analytics will appear here when analytics_daily documents are available." />}
          </div>
        </section>
        <section className="panel">
          <PanelHeading title="Most played" subtitle="Top tracks by streams" aside={<button className="text-button" onClick={() => onNavigate('analytics')}>View all <ArrowUpRight size={14} /></button>} />
          <div className="track-list">
            {topTracks.length ? topTracks.slice(0, 5).map((track, index) => <div className="top-track" key={track.id}>
              <span className="track-rank">{String(index + 1).padStart(2, '0')}</span>
              {track.coverUrl ? <img className="track-cover" src={track.coverUrl} alt="" /> : <div className="track-cover cover-placeholder"><Music2 size={16} /></div>}
              <div className="track-title"><strong>{track.title || 'Untitled track'}</strong><span>{track.artistName || 'Unknown artist'}</span></div>
              <span className="track-plays">{(track.playCount ?? 0).toLocaleString()}</span>
            </div>) : <EmptyState icon={Music2} title="Your charts are warming up" text="Track play counts will show up here." />}
          </div>
        </section>
      </div>
      <section className="quick-actions">
        <div><div className="eyebrow">QUICK ACCESS</div><h2>Keep things moving</h2></div>
        <div className="action-cards">
          {isAllowed('users', claims) && <QuickAction icon={Users} title="Manage users" text="Review accounts and access" onClick={() => onNavigate('users')} />}
          {isAllowed('moderation', claims) && <QuickAction icon={ShieldAlert} title="Moderate content" text="Review tracks and restrictions" onClick={() => onNavigate('moderation')} />}
          {isAllowed('logs', claims) && <QuickAction icon={Clock3} title="View activity" text="Browse the audit trail" onClick={() => onNavigate('logs')} />}
        </div>
      </section>
    </>
  );
}

function UsersPage({ search, claims, onAction, busy }: {
  search: string; claims: Claims; onAction: (action: () => Promise<unknown>, message: string) => Promise<void>; busy: boolean;
}) {
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  useEffect(() => {
    return watchUsers(setUsers, (reason) => setError(reason.message));
  }, []);
  const visible = users.filter((item) => {
    const matchesText = `${item.displayName ?? ''} ${item.email ?? ''} ${item.uid}`.toLowerCase().includes(search.toLowerCase());
    return matchesText && (statusFilter === 'all' || (item.status ?? 'active') === statusFilter);
  });
  return (
    <section className="panel table-panel">
      <div className="table-toolbar">
        <div className="result-count"><strong>{visible.length}</strong> users <span>· Live updates</span></div>
        <label className="select-control"><ListFilter size={15} /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="restricted">Restricted</option><option value="suspended">Suspended</option></select><ChevronDown size={14} /></label>
      </div>
      {error && <InlineNotice tone="error" message={error} />}
      <div className="table-scroll"><table><thead><tr><th>USER</th><th>STATUS</th><th>ROLE</th><th>JOINED</th><th>USER ID</th><th /></tr></thead>
        <tbody>{visible.map((item) => {
          const currentStatus = item.status ?? 'active';
          const role = item.role ?? 'user';
          return <tr key={item.uid}>
            <td><div className="user-cell"><div className="user-photo">{item.photoURL ? <img src={item.photoURL} alt="" /> : (item.displayName?.[0] ?? item.email?.[0] ?? 'U').toUpperCase()}</div><div><strong>{item.displayName || 'Unnamed user'}</strong><span>{item.email || 'No email address'}</span></div></div></td>
            <td><StatusPill value={currentStatus} /></td>
            <td>{claims.admin ? <select className="inline-select" value={role} disabled={busy} aria-label={`Role for ${item.email || item.uid}`} onChange={(event) => {
              const nextRole = event.target.value as AdminRole;
              if (window.confirm(`Change ${item.displayName || item.email || item.uid} to ${roleLabel(nextRole)}?`)) {
                void onAction(() => setAdminRole(item.uid, nextRole), 'Administrator role updated.');
              }
            }}>{roleChoices.map((choice) => <option key={choice} value={choice}>{roleLabel(choice)}</option>)}</select> : <span className={`role-pill role-${role}`}>{roleLabel(role)}</span>}</td>
            <td className="muted-cell">{dayLabels(item.createdAt?.seconds)}</td>
            <td className="mono-cell">{item.uid.slice(0, 10)}…</td>
            <td><select className="action-select" value="" disabled={busy} aria-label={`Actions for ${item.email || item.uid}`} onChange={(event) => {
              const status = event.target.value as UserStatus;
              if (status && window.confirm(`Set this account to ${status}?`)) {
                void onAction(() => setUserStatus(item.uid, status), `User account ${status}.`);
              }
              event.target.value = '';
            }}><option value="">Actions</option>{(['active', 'restricted', 'suspended'] as UserStatus[]).filter((value) => value !== currentStatus).map((value) => <option key={value} value={value}>{value === 'active' ? 'Restore access' : `Set ${value}`}</option>)}</select></td>
          </tr>;
        })}</tbody></table>
      </div>
      {!visible.length && <EmptyState icon={Users} title="No users found" text={search ? 'Try another search.' : 'Users will appear when Firestore profiles are created.'} />}
      <div className="table-footnote"><Shield size={13} /> Role changes are verified and recorded by Cloud Functions.</div>
    </section>
  );
}

function ModerationPage({ search, onAction, busy, onError }: {
  search: string; onAction: (action: () => Promise<unknown>, message: string) => Promise<void>; busy: boolean; onError: (message: string) => void;
}) {
  const [tracks, setTracks] = useState<TrackDocument[]>([]);
  const [status, setStatus] = useState('all');
  const [collection, setCollection] = useState<CatalogCollection>('tracks');
  const [regions, setRegions] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  useEffect(() => watchCatalog(collection, status, setTracks, (reason) => onError(reason.message)), [collection, status, onError]);
  const visible = tracks.filter((item) => `${item.title ?? item.name ?? ''} ${item.artistName ?? item.artist ?? ''} ${item.id}`.toLowerCase().includes(search.toLowerCase()));
  async function handleUpload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadContentAsset(file);
      onError('');
      window.prompt('Asset uploaded. Copy the download URL:', url);
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Asset upload failed.');
    } finally {
      setUploading(false);
    }
  }
  return (
    <>
      <div className="moderation-summary">
        <div><ShieldAlert size={18} /><span>Restrictions and takedowns sync through Firestore in real time.</span></div>
        <label className={`button-secondary upload-button ${uploading ? 'disabled' : ''}`}><Upload size={15} />{uploading ? 'Uploading…' : 'Upload asset'}<input type="file" accept="image/*,audio/*" disabled={uploading} onChange={(e) => { void handleUpload(e.target.files?.[0]); e.target.value = ''; }} /></label>
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar"><div className="result-count"><strong>{visible.length}</strong> {collection} <span>· Live updates</span></div>
          <div className="toolbar-actions">
            <label className="select-control"><Disc3 size={15} /><select value={collection} onChange={(e) => setCollection(e.target.value as CatalogCollection)}><option value="tracks">Tracks</option><option value="albums">Albums</option><option value="artists">Artists</option></select><ChevronDown size={14} /></label>
            <label className="select-control"><SlidersHorizontal size={15} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All content</option>{statusChoices.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select><ChevronDown size={14} /></label>
          </div>
        </div>
        <div className="table-scroll"><table><thead><tr><th>TRACK</th><th>PLAYS</th><th>STATUS</th><th>RESTRICTED REGIONS</th><th /></tr></thead>
          <tbody>{visible.map((track) => <ModerationRow key={track.id} track={track} collection={collection} regionValue={regions[track.id] ?? (track.restrictedRegions ?? []).join(', ')} onRegionChange={(value) => setRegions((current) => ({ ...current, [track.id]: value }))} onAction={onAction} busy={busy} />)}</tbody></table></div>
        {!visible.length && <EmptyState icon={Disc3} title={`No ${collection} found`} text={`Add ${collection} documents to /${collection} to manage releases here.`} />}
        <div className="table-footnote"><FileAudio size={13} /> Asset uploads are stored in the protected admin-assets/ bucket.</div>
      </section>
    </>
  );
}

function ModerationRow({ track, collection, regionValue, onRegionChange, onAction, busy }: {
  track: TrackDocument; regionValue: string; onRegionChange: (value: string) => void;
  collection: CatalogCollection;
  onAction: (action: () => Promise<unknown>, message: string) => Promise<void>; busy: boolean;
}) {
  const status = track.status ?? 'published';
  const title = track.title || track.name || 'Untitled item';
  const artist = track.artistName || track.artist || '—';
  return <tr>
    <td><div className="user-cell">{track.coverUrl ? <img className="track-cover" src={track.coverUrl} alt="" /> : <div className="track-cover cover-placeholder"><Music2 size={16} /></div>}<div><strong>{title}</strong><span>{artist} · {track.id.slice(0, 9)}</span></div></div></td>
    <td className="muted-cell">{(track.playCount ?? 0).toLocaleString()}</td>
    <td><select className={`inline-select content-status status-${status}`} disabled={busy} value={status} aria-label={`Status for ${title}`} onChange={(event) => {
      const next = event.target.value as ContentStatus;
      if (window.confirm(`Change “${title}” to ${next.replace('_', ' ')}?`)) {
        void onAction(() => updateContent(track.id, next, track.restrictedRegions ?? [], collection), 'Content status updated.');
      }
    }}>{statusChoices.map((choice) => <option key={choice} value={choice}>{choice.replace('_', ' ')}</option>)}</select></td>
    <td><div className="region-editor"><input value={regionValue} onChange={(event) => onRegionChange(event.target.value)} placeholder="US, CA, GB" aria-label="Restricted region codes" /><button className="icon-button tiny" disabled={busy || regionValue === (track.restrictedRegions ?? []).join(', ')} title="Save regions" onClick={() => {
      const list = [...new Set(regionValue.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean))];
      void onAction(() => updateContent(track.id, status, list, collection), 'Region restrictions updated.');
    }}><Check size={15} /></button></div></td>
    <td><span className="track-plays">{(track.restrictedRegions ?? []).length ? `${track.restrictedRegions!.length} regions` : '—'}</span></td>
  </tr>;
}

function AnalyticsPage() {
  const [range, setRange] = useState('7d');
  const [daily, setDaily] = useState<AnalyticsDocument[]>([]);
  const [tracks, setTracks] = useState<TrackDocument[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const failed = (reason: Error) => setError(reason.message);
    const unsubs = [watchAnalytics(setDaily, failed, range), watchMostPlayed(setTracks, failed)];
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [range]);
  const shownDays = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : daily.length;
  const chartData = daily.slice(0, shownDays).slice().reverse().map((item) => ({
    label: item.date ?? dayLabels(item.timestamp?.seconds), streams: item.streams ?? 0,
  }));
  const regionData = useMemo(() => Object.entries(daily[0]?.regionalDistribution ?? {}).map(([name, value]) => ({ name, value })), [daily]);
  const deviceData = useMemo(() => Object.entries(daily[0]?.deviceBreakdown ?? {}).map(([name, value]) => ({ name, value })), [daily]);
  return (
    <>
      {error && <InlineNotice tone="error" message={error} />}
      <div className="analytics-toolbar"><div><div className="eyebrow">PERFORMANCE</div><p>Live data from your Firestore analytics collections.</p></div><label className="select-control"><Clock3 size={15} /><select value={range} onChange={(e) => setRange(e.target.value)}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="all_time">All available</option></select><ChevronDown size={14} /></label></div>
      <div className="metric-grid analytics-metrics">
        <MetricCard label="Streams in range" value={chartData.reduce((sum, item) => sum + item.streams, 0).toLocaleString()} icon={Activity} detail="From daily aggregates" />
        <MetricCard label="Top track" value={tracks[0]?.title || '—'} icon={Music2} detail={tracks[0]?.artistName || 'By play count'} />
        <MetricCard label="Track plays" value={(tracks[0]?.playCount ?? 0).toLocaleString()} icon={Headphones} detail="Most-played track" />
      </div>
      <div className="content-grid analytics-grid">
        <section className="panel analytics-chart-panel"><PanelHeading title={range === '24h' ? 'Hourly stream volume' : 'Daily stream volume'} subtitle={`Showing ${range === 'all_time' ? 'up to 1,000 available daily aggregates' : range} aggregates`} />
          <div className="chart-area tall">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 18, right: 14, left: -12, bottom: 0 }}><defs><linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1ed760" stopOpacity={0.25} /><stop offset="100%" stopColor="#1ed760" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#292c29" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#858a85', fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#858a85', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#202320', border: '1px solid #343934', borderRadius: 8 }} /><Area type="monotone" dataKey="streams" stroke="#1ed760" strokeWidth={2.5} fill="url(#analyticsGradient)" /></AreaChart></ResponsiveContainer> : <EmptyState icon={BarChart3} title="Analytics are not available yet" text="Add daily stream aggregates to /analytics_daily." />}</div>
        </section>
        <section className="panel"><PanelHeading title="Regional distribution" subtitle="Latest daily snapshot" />
          {regionData.length ? <div className="donut-wrap"><ResponsiveContainer width="100%" height={194}><PieChart><Pie data={regionData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={4}>{regionData.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip contentStyle={{ background: '#202320', border: '1px solid #343934', borderRadius: 8 }} /></PieChart></ResponsiveContainer><div className="legend">{regionData.slice(0, 5).map((item, index) => <div key={item.name}><i style={{ background: chartColors[index % chartColors.length] }} /><span>{item.name}</span><strong>{item.value.toLocaleString()}</strong></div>)}</div></div> : <EmptyState icon={Activity} title="No regional data" text="Add regionalDistribution to your daily aggregate." />}
        </section>
        <section className="panel"><PanelHeading title="Device breakdown" subtitle="Latest daily snapshot" />
          {deviceData.length ? <div className="device-chart"><ResponsiveContainer width="100%" height={170}><BarChart data={deviceData} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}><CartesianGrid vertical={false} stroke="#292c29" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#a0a5a0', fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#858a85', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#202320', border: '1px solid #343934', borderRadius: 8 }} /><Bar dataKey="value" fill="#1ed760" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState icon={Headphones} title="No device data" text="Add deviceBreakdown to your daily aggregate." />}
        </section>
        <section className="panel most-played-panel"><PanelHeading title="Most played tracks" subtitle="Ranked by play count" />
          <div className="track-list">{tracks.slice(0, 8).map((track, index) => <div className="top-track" key={track.id}><span className="track-rank">{String(index + 1).padStart(2, '0')}</span>{track.coverUrl ? <img className="track-cover" src={track.coverUrl} alt="" /> : <div className="track-cover cover-placeholder"><Music2 size={16} /></div>}<div className="track-title"><strong>{track.title || 'Untitled track'}</strong><span>{track.artistName || 'Unknown artist'}</span></div><span className="track-plays">{(track.playCount ?? 0).toLocaleString()}</span></div>)}</div>
        </section>
      </div>
    </>
  );
}

function AuditPage({ search }: { search: string }) {
  const [logs, setLogs] = useState<AuditLogDocument[]>([]);
  const [severity, setSeverity] = useState('all');
  const [action, setAction] = useState('all');
  const [range, setRange] = useState('all');
  const [error, setError] = useState('');
  useEffect(() => watchAuditLogs(severity, action, setLogs, (reason) => setError(reason.message)), [severity, action]);
  const visible = logs.filter((log) => {
    const matchesText = `${log.actorEmail ?? ''} ${log.action ?? ''} ${log.targetId ?? ''} ${log.actorUid ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const age = log.timestamp?.seconds ? Date.now() - log.timestamp.seconds * 1000 : Infinity;
    const matchesRange = range === 'all' || (range === '24h' ? age <= 86400000 : range === '7d' ? age <= 604800000 : age <= 2592000000);
    return matchesText && matchesRange;
  });
  return (
    <section className="panel table-panel">
      {error && <InlineNotice tone="error" message={error} />}
      <div className="table-toolbar">
        <div><div className="result-count"><strong>{visible.length}</strong> events <span>· Live stream</span></div><p className="toolbar-note">Newest 100 entries · audit logs are immutable</p></div>
        <div className="toolbar-actions">
          <label className="select-control"><ListFilter size={15} /><select value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="all">All severities</option>{(['INFO', 'WARN', 'ERROR', 'CRITICAL'] as Severity[]).map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={14} /></label>
          <label className="select-control"><SlidersHorizontal size={15} /><select value={action} onChange={(e) => setAction(e.target.value)}><option value="all">All actions</option>{['ROLE_UPDATED', 'USER_RESTRICTED', 'USER_ACCESS_RESTORED', 'CONTENT_TAKEDOWN', 'GEOBLOCK_APPLIED', 'CONTENT_STATUS_UPDATED'].map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={14} /></label>
          <label className="select-control"><Clock3 size={15} /><select value={range} onChange={(e) => setRange(e.target.value)}><option value="all">Any time</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select><ChevronDown size={14} /></label>
          <button className="button-secondary" disabled={!visible.length} onClick={() => exportData(visible, 'spotibai-audit-logs', 'csv')}><Download size={15} />Export CSV</button>
          <button className="button-secondary icon-export" disabled={!visible.length} aria-label="Export JSON" onClick={() => exportData(visible, 'spotibai-audit-logs', 'json')}>{'{ }'}</button>
        </div>
      </div>
      <div className="table-scroll"><table><thead><tr><th>EVENT</th><th>ACTOR</th><th>TARGET</th><th>SEVERITY</th><th>TIME</th></tr></thead>
        <tbody>{visible.map((log) => <tr key={log.id}><td><div className="event-cell"><span className={`event-icon severity-icon-${(log.severity ?? 'INFO').toLowerCase()}`}>{log.severity === 'CRITICAL' || log.severity === 'ERROR' ? <AlertTriangle size={15} /> : <Activity size={15} />}</span><div><strong>{log.action || 'Administrative action'}</strong><span>{log.targetCollection || 'system'}</span></div></div></td><td className="muted-cell">{log.actorEmail || log.actorUid || 'System'}</td><td className="mono-cell">{log.targetId || '—'}</td><td><SeverityPill severity={log.severity ?? 'INFO'} /></td><td className="muted-cell">{log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Pending'}</td></tr>)}</tbody></table></div>
      {!visible.length && <EmptyState icon={FileText} title="Nothing to report" text="Administrative actions will appear here as they happen." />}
      <div className="table-footnote"><ShieldCheck size={13} /> Audit entries are written by trusted server-side Functions.</div>
    </section>
  );
}

function Login({ onError }: { onError: (message: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!auth) return;
    setLoading(true);
    setAuthError('');
    onError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Sign-in failed.';
      setAuthError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  }
  return <div className="auth-page"><div className="auth-card">
    <div className="brand auth-brand"><div className="brand-mark"><Music2 size={21} fill="currentColor" /></div><div className="brand-name">spotibai<span>ADMIN</span></div></div>
    <div className="eyebrow">ADMIN ACCESS</div><h1>Good to have you back.</h1><p>Sign in with your Firebase administrator account.</p>
    <form onSubmit={submit}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></label>
      {authError && <InlineNotice tone="error" message={authError} onDismiss={() => { setAuthError(''); onError(''); }} />}
      <button className="primary-button login-button" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}Continue securely</button>
    </form>
    <div className="auth-footnote"><Shield size={14} /> Access is restricted by Firebase custom claims.</div>
  </div></div>;
}

function ConfigurationNotice() {
  return <div className="auth-page"><div className="auth-card config-card">
    <div className="brand auth-brand"><div className="brand-mark"><Music2 size={21} fill="currentColor" /></div><div className="brand-name">spotibai<span>ADMIN</span></div></div>
    <div className="eyebrow">SETUP REQUIRED</div><h1>Connect your Firebase project.</h1>
    <p>The admin console needs a Firebase web app configuration before it can connect to Authentication, Firestore, Functions, and Storage.</p>
    <div className="setup-code"><code>admin/.env.local</code><span>VITE_FIREBASE_API_KEY=…<br />VITE_FIREBASE_PROJECT_ID=…<br />VITE_FIREBASE_APP_ID=…</span></div>
  </div></div>;
}

function FullScreenLoading() {
  return <div className="full-loading"><div className="brand-mark"><Music2 size={21} fill="currentColor" /></div><LoaderCircle className="spin" size={18} /></div>;
}

function AccessDenied({ user, error, loading, onLogout, onBootstrap, canBootstrap }: {
  user: User; error: string; loading: boolean; onLogout: () => void; onBootstrap: () => void; canBootstrap: boolean;
}) {
  return <div className="auth-page"><div className="auth-card denied-card">
    <div className="denied-icon"><ShieldAlert size={25} /></div>
    <div className="eyebrow">ACCESS RESTRICTED</div><h1>This account isn’t an admin.</h1>
    <p>Signed in as <strong>{user.email}</strong>. Ask a super administrator to grant access, or initialize the configured bootstrap account.</p>
    {error && <InlineNotice tone="error" message={error} />}
    {canBootstrap && <button className="primary-button login-button" disabled={loading} onClick={onBootstrap}>{loading ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}Initialize super admin</button>}
    <button className="button-secondary signout-button" onClick={onLogout}><LogOut size={15} />Sign out</button>
  </div></div>;
}

function MetricCard({ label, value, icon: Icon, detail, live, trend }: {
  label: string; value: string; icon: typeof Users; detail: string; live?: boolean; trend?: boolean;
}) {
  return <section className="metric-card">
    <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} strokeWidth={1.8} /></span></div>
    <div className="metric-value">{value}</div>
    <div className={`metric-detail ${live ? 'detail-live' : ''}`}>{live && <i />}{trend && <ArrowUpRight size={13} />}{detail}</div>
  </section>;
}

function PanelHeading({ title, subtitle, aside }: { title: string; subtitle: string; aside?: ReactNode }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{aside}</div>;
}

function QuickAction({ icon: Icon, title, text, onClick }: { icon: typeof Users; title: string; text: string; onClick: () => void }) {
  return <button className="quick-action" onClick={onClick}><span className="quick-icon"><Icon size={18} /></span><span><strong>{title}</strong><small>{text}</small></span><ArrowUpRight size={15} className="quick-arrow" /></button>;
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={20} /></span><strong>{title}</strong><p>{text}</p></div>;
}

function InlineNotice({ tone, message, onDismiss }: { tone: 'error' | 'info'; message: string; onDismiss?: () => void }) {
  return <div className={`inline-notice notice-${tone}`}><AlertTriangle size={15} /><span>{message}</span>{onDismiss && <button onClick={onDismiss} aria-label="Dismiss message"><X size={14} /></button>}</div>;
}

function StatusPill({ value }: { value: UserStatus | ContentStatus }) {
  const key = value.toLowerCase();
  return <span className={`status-pill status-${key}`}><i />{value.replace('_', ' ')}</span>;
}

function SeverityPill({ severity }: { severity: Severity }) {
  return <span className={`severity-pill severity-${severity.toLowerCase()}`}><i />{severity}</span>;
}

export default App;
