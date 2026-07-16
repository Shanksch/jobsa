import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../lib/supabase.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Label } from "@jobsa/ui";
import { LogIn } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success("Successfully logged in!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to log in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      // If email confirmation is required, the session will be null
      if (data.session) {
        // Email confirmation is disabled — user is logged in immediately
        toast.success("Account created successfully!");
        navigate("/");
      } else {
        // Email confirmation is required — don't navigate
        toast.success("Account created! Please check your email to verify before signing in.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md border border-border bg-card/60 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
            <LogIn className="size-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your Career Knowledge Base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={handleSignup}
                className="w-full"
              >
                Create account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
