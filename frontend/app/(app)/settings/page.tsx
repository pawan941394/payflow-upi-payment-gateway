'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { PageHeader, Spinner } from '@/components/ui';

type Settings = {
  profile: { username: string; email: string; business_name: string };
  webhook_url: string;
  sandbox_webhook_url: string;
  api_key: string;
  api_secret_masked: string;
  sandbox_api_key: string;
  sandbox_api_secret_masked: string;
  webhook_secret_masked: string;
  sandbox_webhook_secret_masked: string;
};

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="mb-5">
        <div className="font-semibold text-slate-100">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
      className="shrink-0 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-slate-300 ring-1 ring-white/[0.08] hover:bg-white/[0.1]"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function RevealAlert({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/40">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
          {label} — shown only once
        </div>
        <div className="mt-1 truncate font-mono text-xs text-emerald-200">{value}</div>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

function Notice({ kind, text }: { kind: 'ok' | 'err'; text: string }) {
  return (
    <div
      className={`mt-3 rounded-xl px-4 py-2.5 text-sm ring-1 ${
        kind === 'ok'
          ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
          : 'bg-red-500/10 text-red-300 ring-red-500/30'
      }`}
    >
      {text}
    </div>
  );
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [error, setError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  const [webhookUrl, setWebhookUrl] = useState('');
  const [sandboxWebhookUrl, setSandboxWebhookUrl] = useState('');
  const [webhookMsg, setWebhookMsg] = useState('');
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState('');
  const [revealedSandboxWebhookSecret, setRevealedSandboxWebhookSecret] = useState('');

  const [revealedLive, setRevealedLive] = useState<{ key: string; secret: string } | null>(null);
  const [revealedSandbox, setRevealedSandbox] = useState<{ key: string; secret: string } | null>(null);
  const [keysErr, setKeysErr] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api<Settings>('/settings', { auth: true });
      setS(data);
      setBusinessName(data.profile.business_name);
      setEmail(data.profile.email);
      setWebhookUrl(data.webhook_url);
      setSandboxWebhookUrl(data.sandbox_webhook_url);
    } catch {
      setError('Failed to load settings.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy('profile');
    setProfileMsg('');
    try {
      await api('/settings/profile', { method: 'PUT', auth: true, body: { business_name: businessName, email } });
      setProfileMsg('Profile saved.');
      await load();
    } catch (err) {
      setProfileMsg(err instanceof ApiError ? err.message : 'Save failed.');
    } finally {
      setBusy('');
    }
  }

  async function saveWebhook(path: string, url: string) {
    setBusy(path);
    setWebhookMsg('');
    try {
      await api(path, { method: 'PUT', auth: true, body: { webhook_url: url } });
      setWebhookMsg('Webhook URL saved.');
      await load();
    } catch (err) {
      setWebhookMsg(err instanceof ApiError ? err.message : 'Save failed.');
    } finally {
      setBusy('');
    }
  }

  async function regenerate(name: string, path: string, onDone: (res: Record<string, string>) => void, warn: string) {
    if (!confirm(warn)) return;
    setBusy(name);
    setKeysErr('');
    try {
      const res = await api<Record<string, string>>(path, { method: 'POST', auth: true });
      onDone(res);
      await load();
    } catch (err) {
      setKeysErr(err instanceof ApiError ? err.message : 'Regeneration failed.');
    } finally {
      setBusy('');
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy('password');
    setPwMsg(null);
    try {
      await api('/settings/password', {
        method: 'PUT',
        auth: true,
        body: { current_password: currentPassword, new_password: newPassword },
      });
      setPwMsg({ kind: 'ok', text: 'Password changed.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwMsg({ kind: 'err', text: err instanceof ApiError ? err.message : 'Password change failed.' });
    } finally {
      setBusy('');
    }
  }

  if (error) return <Notice kind="err" text={error} />;
  if (!s)
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );

  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile, webhooks, API keys and security." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Profile">
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Business name</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full" />
            </div>
            <button className="btn btn-primary" disabled={busy === 'profile'}>
              {busy === 'profile' ? 'Saving…' : 'Save profile'}
            </button>
            {profileMsg && <Notice kind={profileMsg === 'Profile saved.' ? 'ok' : 'err'} text={profileMsg} />}
          </form>
        </Section>

        <Section title="Password" subtitle="Changing your password signs out other sessions.">
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Current password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">New password (min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input w-full"
              />
            </div>
            <button className="btn btn-primary" disabled={busy === 'password'}>
              {busy === 'password' ? 'Changing…' : 'Change password'}
            </button>
            {pwMsg && <Notice kind={pwMsg.kind} text={pwMsg.text} />}
          </form>
        </Section>

        <Section title="Webhooks" subtitle="We POST signed events (HMAC-SHA256) to these URLs.">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Live webhook URL</label>
              <div className="flex gap-2">
                <input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://yourapp.com/webhooks/upi"
                  className="input w-full"
                />
                <button
                  className="btn btn-ghost shrink-0"
                  disabled={busy === '/settings/webhook'}
                  onClick={() => saveWebhook('/settings/webhook', webhookUrl)}
                >
                  Save
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Secret: <span className="font-mono">{s.webhook_secret_masked}</span>
                </span>
                <button
                  className="text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
                  disabled={busy === 'wh-secret'}
                  onClick={() =>
                    regenerate(
                      'wh-secret',
                      '/settings/regenerate-webhook-secret',
                      (res) => setRevealedWebhookSecret(res.webhook_secret ?? Object.values(res)[0] ?? ''),
                      'Regenerate the live webhook secret? Existing signature verification will break until you update it.',
                    )
                  }
                >
                  Regenerate
                </button>
              </div>
              {revealedWebhookSecret && <RevealAlert label="New live webhook secret" value={revealedWebhookSecret} />}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Sandbox webhook URL</label>
              <div className="flex gap-2">
                <input
                  value={sandboxWebhookUrl}
                  onChange={(e) => setSandboxWebhookUrl(e.target.value)}
                  placeholder="https://yourapp.com/webhooks/upi-test"
                  className="input w-full"
                />
                <button
                  className="btn btn-ghost shrink-0"
                  disabled={busy === '/settings/sandbox-webhook'}
                  onClick={() => saveWebhook('/settings/sandbox-webhook', sandboxWebhookUrl)}
                >
                  Save
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Secret: <span className="font-mono">{s.sandbox_webhook_secret_masked}</span>
                </span>
                <button
                  className="text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
                  disabled={busy === 'swh-secret'}
                  onClick={() =>
                    regenerate(
                      'swh-secret',
                      '/settings/regenerate-sandbox-webhook-secret',
                      (res) =>
                        setRevealedSandboxWebhookSecret(res.sandbox_webhook_secret ?? Object.values(res)[0] ?? ''),
                      'Regenerate the sandbox webhook secret?',
                    )
                  }
                >
                  Regenerate
                </button>
              </div>
              {revealedSandboxWebhookSecret && (
                <RevealAlert label="New sandbox webhook secret" value={revealedSandboxWebhookSecret} />
              )}
            </div>

            {webhookMsg && <Notice kind={webhookMsg === 'Webhook URL saved.' ? 'ok' : 'err'} text={webhookMsg} />}
          </div>
        </Section>

        <Section title="API Keys" subtitle="Authenticate external API calls with X-Api-Key and X-Api-Secret headers.">
          <div className="space-y-5">
            <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Live</span>
                <button
                  className="text-xs text-red-300 underline-offset-2 hover:underline"
                  disabled={busy === 'live-keys'}
                  onClick={() =>
                    regenerate(
                      'live-keys',
                      '/settings/regenerate-keys',
                      (res) => setRevealedLive({ key: res.api_key ?? '', secret: res.api_secret ?? '' }),
                      'Regenerate LIVE API keys? All existing integrations using the old keys will stop working immediately.',
                    )
                  }
                >
                  {busy === 'live-keys' ? 'Regenerating…' : 'Regenerate'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">Key</div>
                  <div className="truncate font-mono text-xs text-slate-200">{s.api_key}</div>
                </div>
                <CopyButton text={s.api_key} />
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Secret: <span className="font-mono">{s.api_secret_masked}</span>
              </div>
              {revealedLive && <RevealAlert label="New live API secret" value={revealedLive.secret} />}
            </div>

            <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">Sandbox</span>
                <button
                  className="text-xs text-red-300 underline-offset-2 hover:underline"
                  disabled={busy === 'sandbox-keys'}
                  onClick={() =>
                    regenerate(
                      'sandbox-keys',
                      '/settings/regenerate-sandbox-keys',
                      (res) =>
                        setRevealedSandbox({ key: res.sandbox_api_key ?? '', secret: res.sandbox_api_secret ?? '' }),
                      'Regenerate SANDBOX API keys?',
                    )
                  }
                >
                  {busy === 'sandbox-keys' ? 'Regenerating…' : 'Regenerate'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">Key</div>
                  <div className="truncate font-mono text-xs text-slate-200">{s.sandbox_api_key}</div>
                </div>
                <CopyButton text={s.sandbox_api_key} />
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Secret: <span className="font-mono">{s.sandbox_api_secret_masked}</span>
              </div>
              {revealedSandbox && <RevealAlert label="New sandbox API secret" value={revealedSandbox.secret} />}
            </div>

            {keysErr && <Notice kind="err" text={keysErr} />}
          </div>
        </Section>
      </div>
    </div>
  );
}
