import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { request, type Group, type Note, type PostsPage, type Session, type User } from './api';
import { Feedback, Listing, PasswordField, TextEditor, useAction } from './ui';
import './style.css';

type AuthProps = { session: Session; onExpired: () => void };

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const action = useAction();
  return <section className="panel login">
    <h2>Sign in</h2>
    <Feedback error={action.error} />
    <form className="form" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void action.run(async () => onLogin(await request<Session>('/auth/login', {
        method: 'POST', body: { email: form.get('email'), password: form.get('password') }
      })));
    }}>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <PasswordField label="Password" autoComplete="current-password" required />
      <button className="primary" disabled={action.busy}>{action.busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </section>;
}

function Notes({ session, onExpired, all }: AuthProps & { all?: boolean }) {
  const [editing, setEditing] = useState<Note | null>(null);
  const [version, setVersion] = useState(0);
  const action = useAction(onExpired);
  const token = session.token;
  function save(body: { title: string; body: string }) {
    void action.run(async () => {
      await request(editing ? '/notes/' + editing._id : '/notes',
        { token, method: editing ? 'PATCH' : 'POST', body });
      setEditing(null);
      setVersion(value => value + 1);
    });
  }
  return <section>
    <h2>{all ? 'All notes' : 'My notes'}</h2>
    <Feedback error={action.error} />
    {!all && <div className="panel">
      <h3>{editing ? 'Edit note' : 'New note'}</h3>
      <TextEditor key={editing?._id ?? 'new-' + version} initial={editing ?? undefined}
        label={editing ? 'Save changes' : 'Create note'} busy={action.busy} onSave={save}
        onCancel={editing ? () => setEditing(null) : undefined} />
    </div>}
    <Listing<Note> key={version} path={all ? '/admin/notes' : '/notes'} token={token} onExpired={onExpired}>
      {page => page.items.length ? <ul className="cards">{page.items.map(note => <li className="panel" key={note._id}>
        <h3>{note.title}</h3>
        <p className="body-copy">{note.body}</p>
        {all && <p className="metadata">Owner ID <code>{note.ownerId}</code></p>}
        {!all && <div className="actions">
          <button disabled={action.busy} onClick={() => setEditing(note)}>Edit</button>
          <button className="danger" disabled={action.busy} onClick={() => {
            if (!window.confirm('Delete this note?')) return;
            void action.run(async () => {
              await request('/notes/' + note._id, { token, method: 'DELETE' });
              if (editing?._id === note._id) setEditing(null);
              setVersion(value => value + 1);
            });
          }}>Delete</button>
        </div>}
      </li>)}</ul> : <p>No notes on this page.</p>}
    </Listing>
  </section>;
}

function Users({ session, onExpired, onPosts }: AuthProps & { onPosts: (author: PublicAuthor) => void }) {
  const [editing, setEditing] = useState<User | null>(null);
  const [version, setVersion] = useState(0);
  const action = useAction(onExpired);
  const token = session.token;
  return <section>
    <h2>Users</h2>
    <Feedback error={action.error} />
    <form key={editing?._id ?? 'new-' + version} className="panel form" onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const newPassword = String(fields.get('password'));
      void action.run(async () => {
        await request(editing ? '/admin/users/' + editing._id : '/admin/users', {
          token, method: editing ? 'PATCH' : 'POST', body: {
            name: fields.get('name'), email: fields.get('email'),
            interests: String(fields.get('interests')).split(',').map(value => value.trim()).filter(Boolean),
            ...(newPassword ? { password: newPassword } : {})
          }
        });
        setEditing(null);
        setVersion(value => value + 1);
      });
    }}>
      <h3>{editing ? 'Edit user' : 'Add user'}</h3>
      <label>Name<input name="name" required maxLength={100} defaultValue={editing?.name} /></label>
      <label>Email<input name="email" type="email" required maxLength={254} defaultValue={editing?.email} /></label>
      <PasswordField
        label={editing ? 'New password (optional)' : 'Password'}
        autoComplete="new-password"
        minLength={6}
        maxLength={128}
        pattern={String.raw`(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[\p{P}\p{S}]).*`}
        help="Use 6–128 characters with A–Z, a–z, 0–9 and a special character."
        required={!editing}
      />
      <label>Interests (comma-separated)<input name="interests" defaultValue={editing?.interests.join(', ')} /></label>
      <div className="actions">
        <button className="primary" disabled={action.busy}>{editing ? 'Save changes' : 'Add user'}</button>
        {editing && <button type="button" disabled={action.busy} onClick={() => setEditing(null)}>Cancel</button>}
      </div>
    </form>
    <Listing<User> key={version} path="/admin/users" token={token} onExpired={onExpired}>
      {page => page.items.length ? <ul className="cards">{page.items.map(user => <li className="panel" key={user._id}>
        <h3>{user.name}</h3>
        <p className="metadata">{user.email} · {user.role}</p>
        <div className="actions">
          <button onClick={() => onPosts(user)}>View posts</button>
          {user.role === 'user' && <>
            <button disabled={action.busy} onClick={() => setEditing(user)}>Edit</button>
            <button className="danger" disabled={action.busy} onClick={() => {
              if (!window.confirm('Remove access for ' + user.name + '?')) return;
              void action.run(async () => {
                await request('/admin/users/' + user._id, { token, method: 'DELETE' });
                if (editing?._id === user._id) setEditing(null);
                setVersion(value => value + 1);
              });
            }}>Remove</button>
          </>}
        </div>
      </li>)}</ul> : <p>No users on this page.</p>}
    </Listing>
  </section>;
}

function Interests({ session, onExpired, onPosts }: AuthProps & { onPosts: (author: PublicAuthor) => void }) {
  return <section>
    <h2>Users by interest</h2>
    <p className="metadata">Large groups can continue on the next page.</p>
    <Listing<Group> path="/admin/interest-groups" token={session.token} onExpired={onExpired}>
      {page => page.items.length ? <ul className="cards">{page.items.map(group => <li className="panel" key={group.interest}>
        <h3>{group.interest}</h3>
        <ul className="members">{group.users.map(user => <li key={user._id}>
          <span>{user.name}</span><button onClick={() => onPosts(user)}>View posts</button>
        </li>)}</ul>
      </li>)}</ul> : <p>No interests on this page.</p>}
    </Listing>
  </section>;
}

function Posts({ session, authorId, onPosts, onExpired }: {
  session: Session | null; authorId: string; onPosts: (author: PublicAuthor) => void; onExpired: () => void;
}) {
  const [version, setVersion] = useState(0);
  const action = useAction(onExpired);
  return <section>
    <h2>Public posts</h2>
    {session && <div className="actions">
      <button type="button" onClick={() => onPosts(session.user)}>My posts</button>
    </div>}
    <form className="panel form" key={authorId} onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const id = String(fields.get('author') ?? '').trim();
      onPosts({ _id: id, name: 'author' });
    }}>
      <label>
        Author ID
        <input
          name="author"
          required
          pattern="[a-fA-F0-9]{24}"
          defaultValue={authorId}
          title="Enter the 24-character Author ID."
        />
      </label>
      <div className="actions">
        <button type="submit">View posts</button>
      </div>
    </form>
    {session && <div className="panel">
      <h3>Publish a post</h3>
      <Feedback error={action.error} />
      <TextEditor key={version} label="Publish" bodyRequired busy={action.busy} onSave={body => {
        void action.run(async () => {
          await request('/posts', { method: 'POST', token: session.token, body });
          setVersion(value => value + 1);
          onPosts(session.user);
        });
      }} />
    </div>}
    {authorId && <Listing<PostsPage['items'][number], PostsPage> key={authorId + ':' + version}
      path={'/users/' + encodeURIComponent(authorId) + '/posts'}>
      {page => <>
        <h3>Posts by {page.author.name}</h3>
        {page.items.length ? <ul className="cards">{page.items.map(post => <li className="panel" key={post._id}>
          <h3>{post.title}</h3><p className="body-copy">{post.body}</p>
        </li>)}</ul> : <p>This author has no posts on this page.</p>}
      </>}
    </Listing>}
  </section>;
}

type PublicAuthor = Pick<User, '_id' | 'name'>;

function authorIdFromUrl() {
  const { pathname, search } = window.location;
  const match = /^\/users\/[^/]+\/([a-f0-9]{24})\/posts\/?$/i.exec(pathname);
  const legacyId = new URLSearchParams(search).get('author') ?? '';
  return match?.[1] ?? (/^[a-f0-9]{24}$/i.test(legacyId) ? legacyId : '');
}

type View = 'login' | 'notes' | 'all-notes' | 'users' | 'interests' | 'posts';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [author, setAuthor] = useState(authorIdFromUrl);
  const [view, setView] = useState<View>(author ? 'posts' : 'login');
  const [notice, setNotice] = useState('');
  const onExpired = useCallback(() => {
    setSession(null);
    setView('login');
    setNotice('Your session has ended. Sign in again.');
  }, []);
  function openPosts(author: PublicAuthor | null) {
    if (author) {
      window.history.replaceState(null, '', '/?author=' + encodeURIComponent(author._id));
    } else {
      window.history.replaceState(null, '', '/');
    }
    setAuthor(author?._id ?? '');
    setView('posts');
  }

  function navigate(next: View) {
    window.history.replaceState(null, '', '/');
    setAuthor('');
    setView(next);
  }
  const authProps = session ? { session, onExpired } : null;
  const admin = session?.user.role === 'admin';
  return <>
    <header><div className="shell header-inner">
      <h1>Secure Notes</h1>
      {session && <div className="actions">
        <span>{session.user.name} · {session.user.role}</span>
        <button onClick={() => { setSession(null); setNotice(''); navigate('login'); }}>Sign out</button>
      </div>}
    </div></header>
    <main className="shell">
      <nav className="tabs" aria-label="Workspace">
        {(!session ? [['login', 'Sign in']] : [['notes', 'My notes']]).concat(
          admin ? [['all-notes', 'All notes'], ['users', 'Users'], ['interests', 'Interests']] : [],
          [['posts', 'Public posts']]
        ).map(([id, label]) => <button key={id} aria-current={view === id ? 'page' : undefined}
          onClick={() => {
  if (id === 'posts') {
    if (view !== 'posts') openPosts(session?.user ?? null);
    return;
  }
  navigate(id as View);
}}>{label}</button>)}
      </nav>
      {view === 'login' && !session && <>
        {notice && <p role="status">{notice}</p>}
        <Login onLogin={value => { setSession(value); setNotice(''); navigate('notes'); }} />
      </>}
      {view === 'notes' && authProps && <Notes key="own" {...authProps} />}
      {view === 'all-notes' && authProps && admin && <Notes key="all" {...authProps} all />}
      {view === 'users' && authProps && admin && <Users {...authProps} onPosts={openPosts} />}
      {view === 'interests' && authProps && admin && <Interests {...authProps} onPosts={openPosts} />}
      {view === 'posts' && <Posts session={session} authorId={author} onPosts={openPosts} onExpired={onExpired} />}
    </main>
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
