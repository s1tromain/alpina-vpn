"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { BrandLockup } from "@/components/layout/brand";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/stores/admin-store";

/**
 * Web admin panel sign-in. Username + password → HttpOnly session cookie.
 * Standalone (no sidebar / guard); rendered outside the admin chrome by the
 * layout's `/admin/login` carve-out.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAdminStore((s) => s.login);
  const admin = useAdminStore((s) => s.admin);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Already authenticated (e.g. opened /admin/login with a live cookie) →
  // skip straight to the dashboard.
  useEffect(() => {
    if (admin) router.replace("/admin");
  }, [admin, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Введите логин и пароль");
      return;
    }
    setBusy(true);
    try {
      await login(username.trim(), password);
      router.replace("/admin");
    } catch {
      toast.error("Неверный логин или пароль");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-graphite-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <BrandLockup className="mb-8" />

        <GlassCard className="p-6">
          <div className="mb-5 text-center">
            <h1 className="font-serif text-lg tracking-tight">Панель управления</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Войдите, чтобы продолжить
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Логин
              </span>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  autoComplete="username"
                  placeholder="username"
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Пароль
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </label>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Войти
            </Button>
          </form>
        </GlassCard>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Alpina VPN · Console
        </p>
      </div>
    </div>
  );
}
